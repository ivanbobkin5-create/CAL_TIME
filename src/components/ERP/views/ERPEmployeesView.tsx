import React, { useState } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Phone, 
  Mail, 
  Briefcase, 
  Factory, 
  CheckCircle2, 
  Edit2, 
  Trash2, 
  UserCheck, 
  X,
  ShieldCheck,
  Check,
  UserX,
  QrCode,
  Printer
} from 'lucide-react';
import { ERPEmployee } from '../types';
import { EmployeeBadgeModal } from '../components/EmployeeBadgeModal';

interface ERPEmployeesViewProps {
  employees: ERPEmployee[];
  companyName?: string;
  companyId?: string;
  onAddEmployee: (emp: Partial<ERPEmployee>) => void;
  onUpdateEmployee: (emp: ERPEmployee) => void;
  onDeleteEmployee: (id: string) => void;
}

export const PREDEFINED_ROLES = [
  'Распиловщик',
  'Оператор ЧПУ',
  'Оператор кромкооблицовочного станка',
  'Помощник оператора',
  'Упаковщик',
  'Комплектовщик',
  'Сборщик мебели',
  'Водитель / Экспедитор',
  'Замерщик',
  'Кладовщик',
  'Помощник начальника цеха',
  'Начальник цеха'
];

export const ERPEmployeesView: React.FC<ERPEmployeesViewProps> = ({
  employees,
  companyName = 'Мебельное производство',
  companyId = '',
  onAddEmployee,
  onUpdateEmployee,
  onDeleteEmployee
}) => {
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<ERPEmployee | null>(null);
  const [selectedEmployeeForBadge, setSelectedEmployeeForBadge] = useState<ERPEmployee | null>(null);

  const [formEmployee, setFormEmployee] = useState<Partial<ERPEmployee>>({
    name: '',
    role: 'Распиловщик',
    productionRole: 'Распиловщик',
    isProductionEmployee: true,
    department: 'cutting',
    rateType: 'piecework',
    baseRate: 55000,
    shiftType: '2/2',
    status: 'active'
  });

  const [isCustomRole, setIsCustomRole] = useState(false);
  const [customRoleText, setCustomRoleText] = useState('');

  const filtered = employees.filter(e => {
    if (e.email?.toLowerCase() === 'lk.ivanbobkin@gmail.com' || (e as any).isSuperAdmin || e.role === 'superadmin' || e.productionRole === 'superadmin') {
      return false;
    }
    return (
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      (e.role && e.role.toLowerCase().includes(search.toLowerCase())) ||
      (e.productionRole && e.productionRole.toLowerCase().includes(search.toLowerCase())) ||
      (e.phone && e.phone.includes(search))
    );
  });

  const openAddModal = () => {
    setEditingEmployee(null);
    setFormEmployee({
      name: '',
      role: 'Распиловщик',
      productionRole: 'Распиловщик',
      isProductionEmployee: true,
      department: 'cutting',
      rateType: 'piecework',
      baseRate: 55000,
      shiftType: '2/2',
      status: 'active'
    });
    setIsCustomRole(false);
    setCustomRoleText('');
    setShowAddModal(true);
  };

  const openEditModal = (emp: ERPEmployee) => {
    setEditingEmployee(emp);
    const roleVal = emp.productionRole || emp.role || 'Распиловщик';
    const isPredefined = PREDEFINED_ROLES.includes(roleVal);

    setFormEmployee({
      ...emp,
      productionRole: roleVal,
      isProductionEmployee: emp.isProductionEmployee !== undefined ? emp.isProductionEmployee : true
    });

    if (!isPredefined && roleVal) {
      setIsCustomRole(true);
      setCustomRoleText(roleVal);
    } else {
      setIsCustomRole(false);
      setCustomRoleText('');
    }

    setShowAddModal(true);
  };

  const handleRoleSelectChange = (val: string) => {
    if (val === 'CUSTOM') {
      setIsCustomRole(true);
      setFormEmployee(prev => ({ ...prev, productionRole: customRoleText || 'Новая должность' }));
    } else {
      setIsCustomRole(false);
      setFormEmployee(prev => ({ ...prev, productionRole: val, role: val }));
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formEmployee.name?.trim()) return;

    const finalRole = isCustomRole ? (customRoleText.trim() || 'Сотрудник цеха') : (formEmployee.productionRole || 'Распиловщик');

    const payload: Partial<ERPEmployee> = {
      ...formEmployee,
      role: finalRole,
      productionRole: finalRole
    };

    if (editingEmployee) {
      onUpdateEmployee({ ...editingEmployee, ...payload } as ERPEmployee);
    } else {
      onAddEmployee(payload);
    }

    setShowAddModal(false);
  };

  const toggleProductionStatus = (emp: ERPEmployee) => {
    const updated = {
      ...emp,
      isProductionEmployee: !emp.isProductionEmployee
    };
    onUpdateEmployee(updated);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">
            <Users className="w-4 h-4" /> Персонал компании и цеха
          </div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900">
            Сотрудники Мебельного Калькулятора
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Начальник цеха или администратор может назначать должности производственного персонала и определять статус доступа к цеху.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap w-full md:w-auto">
          <div className="relative w-full sm:w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Поиск сотрудника..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </div>

          <button
            onClick={openAddModal}
            className="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" /> Добавить сотрудника
          </button>
        </div>
      </div>

      {/* Employees Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((emp) => {
          const isProd = emp.isProductionEmployee !== false;

          return (
            <div
              key={emp.id}
              className={`bg-white rounded-3xl p-5 border transition-all flex flex-col justify-between ${
                isProd ? 'border-slate-200/80 shadow-sm hover:shadow-md' : 'border-slate-200 opacity-75 bg-slate-50/50'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-md shadow-blue-200 shrink-0">
                      {(emp.name || 'С').substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{emp.name}</h3>
                      <p className="text-xs text-blue-600 font-semibold mt-0.5">
                        {emp.productionRole || emp.role || 'Сотрудник'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                      emp.employmentType === 'outsource'
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : 'bg-blue-50 text-blue-800 border border-blue-200'
                    }`}>
                      {emp.employmentType === 'outsource' ? '🤝 Аутсорс' : '🏢 Штатный'}
                    </span>

                    {emp.employmentType !== 'outsource' && (
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                        isProd ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}>
                        {isProd ? 'Цех' : 'Офис'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Info tags */}
                <div className="space-y-2 py-3 border-y border-slate-100 text-xs">
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="text-slate-400">Сотрудник цеха:</span>
                    <button
                      onClick={() => toggleProductionStatus(emp)}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        isProd ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                      }`}
                    >
                      {isProd ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                      <span>{isProd ? 'Да (в цехе)' : 'Нет'}</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-slate-600">
                    <span className="text-slate-400">Участок:</span>
                    <span className="font-bold text-slate-800">
                      {emp.department === 'cutting' ? 'Раскрой' : emp.department === 'edging' ? 'Кромление' : emp.department === 'cnc' ? 'Присадка ЧПУ' : emp.department === 'assembly' ? 'Сборка' : emp.department === 'packing' ? 'Упаковка' : emp.department === 'warehouse' ? 'Склад' : 'Администрация'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="text-slate-400">График:</span>
                    <span className="font-mono font-bold text-slate-800">{emp.shiftType || '2/2'}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="text-slate-400">Оплата:</span>
                    <span className="font-bold text-indigo-600">
                      {emp.rateType === 'piecework' ? 'Сдельная от выработки' : `${(emp.baseRate || 55000)?.toLocaleString('ru-RU')} ₽ / мес`}
                    </span>
                  </div>
                  {(emp.carPlate || emp.carModel) && (
                    <div className="flex items-center justify-between text-slate-600 bg-amber-50/60 p-1.5 rounded-xl border border-amber-200">
                      <span className="text-amber-800 font-bold">🚗 Авто:</span>
                      <span className="font-mono font-bold text-slate-900 text-[11px]">
                        {emp.carModel ? `${emp.carModel} ` : ''}{emp.carPlate || ''}
                      </span>
                    </div>
                  )}
                  {emp.email && (
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="text-slate-400">Email:</span>
                      <span className="font-medium text-slate-800 truncate max-w-[160px]">{emp.email}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Card Actions */}
              <div className="mt-4 pt-3 flex items-center justify-between border-t border-slate-100 gap-2">
                {emp.employmentType === 'outsource' ? (
                  <div className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200">
                    🤝 Аутсорс (Аналитические данные)
                  </div>
                ) : (
                  <button
                    onClick={() => setSelectedEmployeeForBadge(emp)}
                    className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-indigo-200/60"
                    title="Открыть карточку и распечатать QR-бейдж"
                  >
                    <QrCode className="w-3.5 h-3.5 text-indigo-600" />
                    <span>QR-бейдж</span>
                  </button>
                )}

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(emp)}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>Редактировать</span>
                  </button>

                  {!emp.isOwner && (
                    <button
                      onClick={() => onDeleteEmployee(emp.id)}
                      className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                      title="Удалить из списка"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Employee Badge Modal */}
      {selectedEmployeeForBadge && (
        <EmployeeBadgeModal
          isOpen={!!selectedEmployeeForBadge}
          onClose={() => setSelectedEmployeeForBadge(null)}
          employee={selectedEmployeeForBadge}
          companyName={companyName}
          companyId={companyId}
          onUpdateEmployee={(updated) => {
            onUpdateEmployee(updated);
            setSelectedEmployeeForBadge(updated);
          }}
        />
      )}

      {/* Add / Edit Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-black text-slate-900">
                {editingEmployee ? 'Редактировать сотрудника' : 'Добавить сотрудника в ERP'}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ФИО сотрудника *</label>
                <input
                  type="text"
                  required
                  placeholder="Иванов Сергей Петрович"
                  value={formEmployee.name || ''}
                  onChange={(e) => setFormEmployee({ ...formEmployee, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              {/* Employment Type */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormEmployee({ ...formEmployee, employmentType: 'staff' })}
                  className={`p-2.5 rounded-2xl border font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all ${
                    formEmployee.employmentType !== 'outsource'
                      ? 'bg-blue-600 text-white border-blue-700 shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span>🏢 Штатный сотрудник</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormEmployee({ ...formEmployee, employmentType: 'outsource' })}
                  className={`p-2.5 rounded-2xl border font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all ${
                    formEmployee.employmentType === 'outsource'
                      ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span>🤝 Аутсорс / Наемный</span>
                </button>
              </div>

              {/* Is Outsource Help Notice */}
              {formEmployee.employmentType === 'outsource' ? (
                <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-amber-950 text-xs space-y-1">
                  <div className="font-bold text-amber-900 flex items-center gap-1.5">
                    <span>💡 Аутсорс-исполнитель (аналитические данные)</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-amber-800">
                    Используется исключительно для выбора при назначении отгрузки/доставки и сборки мебели. Не создается учетная запись (Email/Пароль), не требуется QR-бейдж и не добавляется в график смен цеха.
                  </p>
                </div>
              ) : (
                /* Is Production Employee Checkbox for Staff */
                <div className="p-3 bg-blue-50/60 rounded-2xl border border-blue-100 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-900">Сотрудник производства</div>
                    <div className="text-[11px] text-slate-500">Доступ к ERP канбану и участкам цеха</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={formEmployee.isProductionEmployee !== false}
                    onChange={(e) => setFormEmployee({ ...formEmployee, isProductionEmployee: e.target.checked })}
                    className="w-5 h-5 rounded-lg text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                  />
                </div>
              )}

              {/* Position Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Должность / Роль *</label>
                <select
                  value={isCustomRole ? 'CUSTOM' : (formEmployee.productionRole || PREDEFINED_ROLES[0])}
                  onChange={(e) => handleRoleSelectChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {PREDEFINED_ROLES.map((roleName) => (
                    <option key={roleName} value={roleName}>
                      {roleName}
                    </option>
                  ))}
                  <option value="CUSTOM">+ Добавить новую должность...</option>
                </select>

                {isCustomRole && (
                  <div className="mt-2">
                    <input
                      type="text"
                      required
                      placeholder="Введите название новой должности"
                      value={customRoleText}
                      onChange={(e) => {
                        setCustomRoleText(e.target.value);
                        setFormEmployee(prev => ({ ...prev, productionRole: e.target.value, role: e.target.value }));
                      }}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-white border border-blue-300 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>

              {/* Vehicle info for drivers/couriers */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Госномер ТС</label>
                  <input
                    type="text"
                    placeholder="А 123 ВС 777"
                    value={formEmployee.carPlate || ''}
                    onChange={(e) => setFormEmployee({ ...formEmployee, carPlate: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-mono font-bold text-slate-900 outline-none uppercase"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Марка / Авто</label>
                  <input
                    type="text"
                    placeholder="ГАЗель Некст"
                    value={formEmployee.carModel || ''}
                    onChange={(e) => setFormEmployee({ ...formEmployee, carModel: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-900 outline-none"
                  />
                </div>
              </div>

              {/* Staff-only fields: department, schedule, rate type, base rate */}
              {formEmployee.employmentType !== 'outsource' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Участок цеха</label>
                      <select
                        value={formEmployee.department || 'cutting'}
                        onChange={(e) => setFormEmployee({ ...formEmployee, department: e.target.value as any })}
                        className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="cutting">Раскрой</option>
                        <option value="edging">Кромкооблицовка</option>
                        <option value="cnc">Присадка ЧПУ</option>
                        <option value="facades">Фасады</option>
                        <option value="assembly">Сборка</option>
                        <option value="packing">Упаковка</option>
                        <option value="warehouse">Склад</option>
                        <option value="management">Администрация цеха</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">График работы</label>
                      <select
                        value={formEmployee.shiftType || '2/2'}
                        onChange={(e) => setFormEmployee({ ...formEmployee, shiftType: e.target.value as any })}
                        className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="2/2">2 через 2</option>
                        <option value="5/2">5 через 2</option>
                        <option value="flexible">Гибкий график</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Тип оплаты</label>
                      <select
                        value={formEmployee.rateType || 'piecework'}
                        onChange={(e) => setFormEmployee({ ...formEmployee, rateType: e.target.value as any })}
                        className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="piecework">Сдельная от выработки</option>
                        <option value="salary">Фиксированный оклад</option>
                        <option value="hourly">Почасовая ставка</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Базовая ставка (₽)</label>
                      <input
                        type="number"
                        value={formEmployee.baseRate || 55000}
                        onChange={(e) => setFormEmployee({ ...formEmployee, baseRate: Number(e.target.value) })}
                        className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Phone input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Телефон / Связь *</label>
                <input
                  type="text"
                  placeholder="+7 (999) 000-00-00"
                  value={formEmployee.phone || ''}
                  onChange={(e) => setFormEmployee({ ...formEmployee, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              {/* Login Email & Password for Staff only */}
              {formEmployee.employmentType !== 'outsource' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Email для входа</label>
                    <input
                      type="email"
                      placeholder="master@company.ru"
                      value={formEmployee.email || ''}
                      onChange={(e) => setFormEmployee({ ...formEmployee, email: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Пароль авторизации в Мебельном калькуляторе / ERP</label>
                    <input
                      type="text"
                      placeholder="Придумайте пароль или оставьте пустые если не нужен"
                      value={formEmployee.tempPassword || formEmployee.password || ''}
                      onChange={(e) => setFormEmployee({ ...formEmployee, tempPassword: e.target.value, password: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                    />
                    <p className="text-[11px] text-slate-500 mt-1 font-medium">
                      С этими учетными данными (Email и Пароль) сотрудник может входить как в ERP цеха, так и в основной сервис Мебельного калькулятора.
                    </p>
                  </div>
                </>
              )}

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-200 cursor-pointer"
                >
                  {editingEmployee ? 'Сохранить изменения' : 'Добавить сотрудника'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

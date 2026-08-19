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
  Check
} from 'lucide-react';
import { ERPEmployee } from '../types';

interface ERPEmployeesViewProps {
  employees: ERPEmployee[];
  onAddEmployee: (emp: Partial<ERPEmployee>) => void;
  onUpdateEmployee: (emp: ERPEmployee) => void;
  onDeleteEmployee: (id: string) => void;
}

export const ERPEmployeesView: React.FC<ERPEmployeesViewProps> = ({
  employees,
  onAddEmployee,
  onUpdateEmployee,
  onDeleteEmployee
}) => {
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmployee, setNewEmployee] = useState<Partial<ERPEmployee>>({
    name: '',
    role: 'Оператор станка',
    department: 'cutting',
    rateType: 'piecework',
    baseRate: 50000,
    shiftType: '2/2',
    status: 'active'
  });

  const filtered = employees.filter(e => 
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.role.toLowerCase().includes(search.toLowerCase()) ||
    (e.phone && e.phone.includes(search))
  );

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmployee.name?.trim()) return;
    onAddEmployee(newEmployee);
    setShowAddModal(false);
    setNewEmployee({
      name: '',
      role: 'Оператор станка',
      department: 'cutting',
      rateType: 'piecework',
      baseRate: 50000,
      shiftType: '2/2',
      status: 'active'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">
            <Users className="w-4 h-4" /> Производственный персонал
          </div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900">
            Сотрудники и мастера цеха
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Поиск мастера..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-200 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" /> Добавить мастера
          </button>
        </div>
      </div>

      {/* Employees Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((emp) => (
          <div
            key={emp.id}
            className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-md shadow-blue-200">
                    {emp.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{emp.name}</h3>
                    <p className="text-xs text-slate-500 font-medium">{emp.role}</p>
                  </div>
                </div>

                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                  emp.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                }`}>
                  {emp.status === 'active' ? 'В штате' : 'Не активен'}
                </span>
              </div>

              {/* Info tags */}
              <div className="space-y-2 py-3 border-y border-slate-100 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span className="text-slate-400">Участок:</span>
                  <span className="font-bold text-slate-800">
                    {emp.department === 'cutting' ? 'Раскрой' : emp.department === 'edging' ? 'Кромление' : emp.department === 'cnc' ? 'Присадка ЧПУ' : emp.department === 'assembly' ? 'Сборка' : 'Цех'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span className="text-slate-400">График:</span>
                  <span className="font-mono font-bold text-slate-800">{emp.shiftType || '2/2'}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span className="text-slate-400">Оплата:</span>
                  <span className="font-bold text-indigo-600">
                    {emp.rateType === 'piecework' ? 'Сдельная от выработки' : `${emp.baseRate?.toLocaleString('ru-RU')} ₽ / мес`}
                  </span>
                </div>
                {emp.phone && (
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="text-slate-400">Телефон:</span>
                    <span className="font-medium text-slate-800">{emp.phone}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Card Actions */}
            <div className="mt-4 pt-2 flex items-center justify-end gap-2">
              <button
                onClick={() => onDeleteEmployee(emp.id)}
                className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                title="Удалить"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-black text-slate-900">Добавить мастера в цех</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ФИО мастера *</label>
                <input
                  type="text"
                  required
                  placeholder="Иванов Сергей Петрович"
                  value={newEmployee.name || ''}
                  onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Должность</label>
                  <input
                    type="text"
                    placeholder="Распиловщик"
                    value={newEmployee.role || ''}
                    onChange={(e) => setNewEmployee({ ...newEmployee, role: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Участок</label>
                  <select
                    value={newEmployee.department || 'cutting'}
                    onChange={(e) => setNewEmployee({ ...newEmployee, department: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="cutting">Раскрой</option>
                    <option value="edging">Кромкооблицовка</option>
                    <option value="cnc">Присадка ЧПУ</option>
                    <option value="facades">Фасады</option>
                    <option value="assembly">Сборка</option>
                    <option value="management">Мастер цеха</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Тип оплаты</label>
                  <select
                    value={newEmployee.rateType || 'piecework'}
                    onChange={(e) => setNewEmployee({ ...newEmployee, rateType: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="piecework">Сдельная</option>
                    <option value="salary">Оклад</option>
                    <option value="hourly">Почасовая</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">График</label>
                  <select
                    value={newEmployee.shiftType || '2/2'}
                    onChange={(e) => setNewEmployee({ ...newEmployee, shiftType: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="2/2">2 через 2</option>
                    <option value="5/2">5 через 2</option>
                    <option value="flexible">Гибкий</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Телефон</label>
                <input
                  type="text"
                  placeholder="+7 (999) 000-00-00"
                  value={newEmployee.phone || ''}
                  onChange={(e) => setNewEmployee({ ...newEmployee, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-200"
                >
                  Сохранить мастера
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

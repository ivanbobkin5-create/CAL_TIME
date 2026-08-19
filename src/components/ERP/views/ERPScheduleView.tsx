import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  Users, 
  Clock, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  UserCheck, 
  UserX, 
  ChevronLeft, 
  ChevronRight,
  Filter,
  Check
} from 'lucide-react';
import { ERPEmployee, WorkShift } from '../types';

interface ERPScheduleViewProps {
  employees: ERPEmployee[];
  shifts: WorkShift[];
  onAddShift?: (shift: Partial<WorkShift>) => void;
}

export const ERPScheduleView: React.FC<ERPScheduleViewProps> = ({
  employees,
  shifts,
  onAddShift
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [showAddShiftModal, setShowAddShiftModal] = useState(false);

  const departmentsList = [
    { id: 'all', name: 'Все участки' },
    { id: 'cutting', name: 'Раскрой' },
    { id: 'edging', name: 'Кромкооблицовка' },
    { id: 'cnc', name: 'Присадка ЧПУ' },
    { id: 'facades', name: 'Фасады' },
    { id: 'assembly', name: 'Сборка и ОТК' }
  ];

  const filteredEmployees = employees.filter(e => {
    if (selectedDepartment === 'all') return true;
    return e.department === selectedDepartment;
  });

  return (
    <div className="space-y-6">
      {/* Header & Date Selector */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">
            <Users className="w-4 h-4" /> График смен и табель
          </div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900">
            Расписание работы цеха и мастеров
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Department Filter */}
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            {departmentsList.map(dep => (
              <option key={dep.id} value={dep.id}>{dep.name}</option>
            ))}
          </select>

          {/* Date Picker */}
          <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-200">
            <CalendarIcon className="w-4 h-4 text-indigo-600" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
            />
          </div>

          <button
            onClick={() => setShowAddShiftModal(true)}
            className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-200 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Назначить смену
          </button>
        </div>
      </div>

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">
              {employees.filter(e => e.status === 'active').length}
            </div>
            <div className="text-xs font-semibold text-slate-500">На смене сегодня</div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">12.0 ч</div>
            <div className="text-xs font-semibold text-slate-500">Длительность смены (08:00–20:00)</div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{employees.length}</div>
            <div className="text-xs font-semibold text-slate-500">Всего в штате производства</div>
          </div>
        </div>
      </div>

      {/* Staff Schedule Table */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
        <h3 className="font-bold text-slate-900 text-base mb-1">Табель сменности сотрудников</h3>
        <p className="text-xs text-slate-400 mb-6">Распределение мастеров по участкам и станкам</p>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-black uppercase text-slate-400">
                <th className="pb-3 px-3">Сотрудник</th>
                <th className="pb-3 px-3">Участок</th>
                <th className="pb-3 px-3">График</th>
                <th className="pb-3 px-3">Ставка</th>
                <th className="pb-3 px-3">Статус сегодня</th>
                <th className="pb-3 px-3 text-right">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
              {filteredEmployees.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-3 font-bold text-slate-900 flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs">
                      {emp.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div>{emp.name}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{emp.role}</div>
                    </div>
                  </td>
                  <td className="py-3.5 px-3">
                    <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 text-[11px] font-bold">
                      {emp.department === 'cutting' ? 'Раскрой' : emp.department === 'edging' ? 'Кромление' : emp.department === 'cnc' ? 'ЧПУ' : emp.department === 'assembly' ? 'Сборка' : 'Цех'}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 font-mono font-bold text-slate-800">
                    {emp.shiftType || '2/2'}
                  </td>
                  <td className="py-3.5 px-3 font-semibold text-slate-800">
                    {emp.rateType === 'piecework' ? 'Сдельная' : `${emp.baseRate} ₽/час`}
                  </td>
                  <td className="py-3.5 px-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      На смене
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-right">
                    <button className="px-3 py-1 rounded-xl bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-[11px] font-bold text-slate-600 transition-colors">
                      Отметить выход
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

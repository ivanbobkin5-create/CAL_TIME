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
  Check
} from 'lucide-react';
import { ERPEmployee, SalaryRecord } from '../types';

interface ERPSalariesViewProps {
  employees: ERPEmployee[];
}

export const ERPSalariesView: React.FC<ERPSalariesViewProps> = ({
  employees
}) => {
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().substring(0, 7));
  const [search, setSearch] = useState('');

  // Example salary calculations based on employee rates
  const calculatedSalaries = employees.map(emp => {
    let piecework = 0;
    let base = emp.baseRate || 45000;
    
    if (emp.department === 'cutting') {
      piecework = Math.round(180 * 65); // 180 m2 * 65 rub
    } else if (emp.department === 'edging') {
      piecework = Math.round(450 * 35); // 450 m * 35 rub
    } else if (emp.department === 'cnc') {
      piecework = Math.round(1200 * 8); // 1200 holes * 8 rub
    } else if (emp.department === 'assembly') {
      piecework = Math.round(42 * 350); // 42 modules * 350 rub
    }

    const bonus = emp.status === 'active' ? 5000 : 0;
    const total = (emp.rateType === 'piecework' ? piecework : base) + bonus;

    return {
      employee: emp,
      base,
      piecework,
      bonus,
      total,
      hoursWorked: 168,
      status: 'approved'
    };
  });

  const totalPayroll = calculatedSalaries.reduce((sum, s) => sum + s.total, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">
            <DollarSign className="w-4 h-4" /> Фонд оплаты труда цеха
          </div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900">
            Расчет зарплат и сдельной выработки
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
            className="px-4 py-2 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Printer className="w-4 h-4" /> Ведомость
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm">
          <div className="text-xs font-bold text-slate-400 uppercase mb-2">Общий ФОТ за месяц</div>
          <div className="text-3xl font-black text-slate-900 mb-1">
            {totalPayroll.toLocaleString('ru-RU')} <span className="text-base font-bold text-slate-400">₽</span>
          </div>
          <div className="text-xs text-slate-500 font-medium">Сотрудников к выплате: {employees.length} чел.</div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm">
          <div className="text-xs font-bold text-slate-400 uppercase mb-2">Сдельная часть выработки</div>
          <div className="text-3xl font-black text-indigo-600 mb-1">
            {calculatedSalaries.reduce((sum, s) => sum + s.piecework, 0).toLocaleString('ru-RU')} <span className="text-base font-bold text-slate-400">₽</span>
          </div>
          <div className="text-xs text-emerald-600 font-bold flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> Прямая привязка к объемам цеха
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm">
          <div className="text-xs font-bold text-slate-400 uppercase mb-2">Средняя ЗП мастера</div>
          <div className="text-3xl font-black text-emerald-600 mb-1">
            {employees.length > 0 ? Math.round(totalPayroll / employees.length).toLocaleString('ru-RU') : 0} <span className="text-base font-bold text-slate-400">₽</span>
          </div>
          <div className="text-xs text-slate-500 font-medium">Без учета налоговых вычетов</div>
        </div>
      </div>

      {/* Salaries Breakdown Table */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
        <h3 className="font-bold text-slate-900 text-base mb-1">Ведомость начислений по сотрудникам</h3>
        <p className="text-xs text-slate-400 mb-6">Детализация окладной, сдельной и премиальной частей</p>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-black uppercase text-slate-400">
                <th className="pb-3 px-3">Мастер / Должность</th>
                <th className="pb-3 px-3">Участок</th>
                <th className="pb-3 px-3">Тип оплаты</th>
                <th className="pb-3 px-3">Сдельная выработка</th>
                <th className="pb-3 px-3">Премия</th>
                <th className="pb-3 px-3 font-black text-slate-900 text-right">Итого к выплате</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
              {calculatedSalaries.map(({ employee, piecework, bonus, total }) => (
                <tr key={employee.id} className="hover:bg-slate-50">
                  <td className="py-3 px-3 font-bold text-slate-900 flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs">
                      {employee.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div>{employee.name}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{employee.role}</div>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 text-[11px] font-bold">
                      {employee.department === 'cutting' ? 'Раскрой' : employee.department === 'edging' ? 'Кромление' : employee.department === 'cnc' ? 'ЧПУ' : employee.department === 'assembly' ? 'Сборка' : 'Цех'}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-600 font-medium">
                    {employee.rateType === 'piecework' ? 'Сдельная (за объем)' : 'Оклад + Сдельная'}
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-indigo-600">
                    {piecework.toLocaleString('ru-RU')} ₽
                  </td>
                  <td className="py-3 px-3 font-mono text-emerald-600 font-bold">
                    +{bonus.toLocaleString('ru-RU')} ₽
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-black text-slate-900 text-sm">
                    {total.toLocaleString('ru-RU')} ₽
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

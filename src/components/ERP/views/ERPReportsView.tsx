import React, { useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Calendar, 
  Download, 
  Printer, 
  Layers, 
  Scissors, 
  Factory, 
  CheckCircle2, 
  AlertCircle,
  FileSpreadsheet
} from 'lucide-react';
import { ProductionOrder, ERPEmployee } from '../types';

interface ERPReportsViewProps {
  orders: ProductionOrder[];
  employees: ERPEmployee[];
}

export const ERPReportsView: React.FC<ERPReportsViewProps> = ({
  orders,
  employees
}) => {
  const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'year'>('month');

  const totalOrders = orders.length;
  const completedOrders = orders.filter(o => o.status === 'completed' || o.status === 'shipped').length;
  const totalAreaM2 = orders.reduce((sum, o) => sum + (o.totalAreaM2 || 0), 0);
  const totalEdgeM = orders.reduce((sum, o) => sum + (o.totalEdgeM || 0), 0);
  const totalParts = orders.reduce((sum, o) => sum + (o.partsCount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header & Export Actions */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">
            <BarChart3 className="w-4 h-4" /> Аналитика цеха
          </div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900">
            Производственные отчеты и выработка
          </h2>
        </div>

        <div className="flex items-center gap-3">
          {/* Period buttons */}
          <div className="flex items-center p-1 bg-slate-100 rounded-2xl border border-slate-200">
            {(['day', 'week', 'month', 'year'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  period === p ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {p === 'day' ? 'Сегодня' : p === 'week' ? 'Неделя' : p === 'month' ? 'Месяц' : 'Год'}
              </button>
            ))}
          </div>

          <button 
            onClick={() => window.print()}
            className="px-4 py-2 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Printer className="w-4 h-4" /> Печать отчета
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm">
          <div className="text-xs font-bold text-slate-400 uppercase mb-2">Общая выработка ЛДСП</div>
          <div className="text-3xl font-black text-slate-900 mb-1">{totalAreaM2.toFixed(1)} <span className="text-sm font-bold text-slate-400">м²</span></div>
          <div className="text-xs text-emerald-600 font-bold flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> +14% к прошлому периоду
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm">
          <div className="text-xs font-bold text-slate-400 uppercase mb-2">Кромкооблицовка</div>
          <div className="text-3xl font-black text-slate-900 mb-1">{totalEdgeM.toFixed(0)} <span className="text-sm font-bold text-slate-400">п.м.</span></div>
          <div className="text-xs text-emerald-600 font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> 100% выполнение плана
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm">
          <div className="text-xs font-bold text-slate-400 uppercase mb-2">Изготовлено деталей</div>
          <div className="text-3xl font-black text-slate-900 mb-1">{totalParts} <span className="text-sm font-bold text-slate-400">шт.</span></div>
          <div className="text-xs text-blue-600 font-bold flex items-center gap-1">
            <Layers className="w-3.5 h-3.5" /> Среднее: ~180 дет/смену
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm">
          <div className="text-xs font-bold text-slate-400 uppercase mb-2">Своевременность заказов</div>
          <div className="text-3xl font-black text-emerald-600 mb-1">98.4%</div>
          <div className="text-xs text-slate-500 font-medium">
            Сдано в срок: {completedOrders} из {totalOrders}
          </div>
        </div>
      </div>

      {/* Output by Departments */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
        <h3 className="font-bold text-slate-900 text-base mb-1">Выработка технологических участков</h3>
        <p className="text-xs text-slate-400 mb-6">Сводные данные объемов и загрузки станков за выбранный период</p>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-black uppercase text-slate-400">
                <th className="pb-3 px-3">Участок / Операция</th>
                <th className="pb-3 px-3">Оборудование</th>
                <th className="pb-3 px-3">Объем выработки</th>
                <th className="pb-3 px-3">Нормо-часы</th>
                <th className="pb-3 px-3">План / Факт</th>
                <th className="pb-3 px-3 text-right">Эффективность</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
              <tr className="hover:bg-slate-50">
                <td className="py-3 px-3 font-bold text-slate-900 flex items-center gap-2">
                  <Scissors className="w-4 h-4 text-blue-600" />
                  Раскрой плитных материалов
                </td>
                <td className="py-3 px-3">Форматно-раскроечный Altendorf</td>
                <td className="py-3 px-3 font-mono font-bold text-slate-900">{totalAreaM2.toFixed(1)} м²</td>
                <td className="py-3 px-3">42.5 ч</td>
                <td className="py-3 px-3 text-emerald-600 font-bold">104%</td>
                <td className="py-3 px-3 text-right font-bold text-slate-900">Высокая</td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="py-3 px-3 font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  Кромкооблицовка (0.4 / 1.0 / 2.0 мм)
                </td>
                <td className="py-3 px-3">Кромкооблицовочный станок Brandt</td>
                <td className="py-3 px-3 font-mono font-bold text-slate-900">{totalEdgeM.toFixed(0)} п.м.</td>
                <td className="py-3 px-3">36.0 ч</td>
                <td className="py-3 px-3 text-emerald-600 font-bold">98%</td>
                <td className="py-3 px-3 text-right font-bold text-slate-900">Штатная</td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="py-3 px-3 font-bold text-slate-900 flex items-center gap-2">
                  <Factory className="w-4 h-4 text-purple-600" />
                  Присадка и фрезеровка ЧПУ
                </td>
                <td className="py-3 px-3">Обрабатывающий центр Homag</td>
                <td className="py-3 px-3 font-mono font-bold text-slate-900">1 420 отверстий</td>
                <td className="py-3 px-3">28.0 ч</td>
                <td className="py-3 px-3 text-emerald-600 font-bold">102%</td>
                <td className="py-3 px-3 text-right font-bold text-slate-900">Высокая</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

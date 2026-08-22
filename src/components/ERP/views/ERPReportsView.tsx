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
  FileSpreadsheet,
  UserCheck,
  User,
  Users,
  Award,
  Clock,
  Wrench,
  Package,
  Truck,
  Search,
  ChevronRight,
  X,
  Filter,
  DollarSign,
  Box,
  Flame,
  ShieldCheck,
  ArrowRight,
  Eye
} from 'lucide-react';
import { ProductionOrder, ERPEmployee, ERPCompanySettings, EmployeeWorkLog, ProductionStageId } from '../types';

interface ERPReportsViewProps {
  orders: ProductionOrder[];
  employees: ERPEmployee[];
  settings?: ERPCompanySettings;
}

export const ERPReportsView: React.FC<ERPReportsViewProps> = ({
  orders,
  employees,
  settings
}) => {
  const [reportTab, setReportTab] = useState<'factory' | 'employees' | 'timeline'>('factory');
  const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'all'>('month');
  const [selectedEmpForTimeline, setSelectedEmpForTimeline] = useState<ERPEmployee | null>(null);
  const [timelineSearch, setTimelineSearch] = useState('');

  // Piecework Tariffs from settings or defaults
  const cuttingRate = settings?.cuttingRatePerM2 || 65; // ₽/м²
  const edgingRate = settings?.edgingRatePerM || 35;   // ₽/п.м.
  const cncRate = settings?.cncHoleRate || 8;          // ₽/отверстие
  const assemblyRate = settings?.assemblyModuleRate || 350; // ₽/модуль
  const packingRate = 80;  // ₽/место
  const shippingRate = 150; // ₽/заказ

  // Date Filtering Helper
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const getStartDateForPeriod = (): string => {
    const d = new Date();
    if (period === 'day') {
      return todayStr;
    } else if (period === 'week') {
      d.setDate(d.getDate() - 7);
      return d.toISOString().split('T')[0];
    } else if (period === 'month') {
      d.setDate(d.getDate() - 30);
      return d.toISOString().split('T')[0];
    }
    return '2020-01-01'; // 'all'
  };

  const startDateStr = getStartDateForPeriod();

  // Filter orders by period
  const filteredOrders = orders.filter(o => {
    const orderDate = o.createdAt?.split('T')[0] || todayStr;
    return orderDate >= startDateStr;
  });

  // Collect all work logs and scan events across all orders
  const allRawLogs = orders.flatMap(o => (o.workLogs || []).map(l => ({ ...l, orderNumber: o.orderNumber })));

  // Generate synthetic scan audit events if workLogs were sparse
  const generatedAuditEvents: Array<{
    id: string;
    employeeId: string;
    employeeName: string;
    orderId: string;
    orderNumber: string;
    stageId: ProductionStageId;
    stageName: string;
    timestamp: string;
    actionDetail: string;
    volumeText: string;
    volumeM2?: number;
    volumeMeters?: number;
    volumeParts?: number;
    earnedPrice?: number;
  }> = [];

  // Parse explicit order workLogs into audit events first
  orders.forEach(ord => {
    (ord.workLogs || []).forEach(log => {
      const stageNameMap: Record<string, string> = {
        queue: 'Очередь запуска',
        cutting: 'Распил ЛДСП/МДФ',
        edging: 'Кромкооблицовка',
        cnc: 'Присадка / ЧПУ',
        facades: 'Фасадный участок',
        assembly: 'Сборка корпусов',
        kitting: 'Комплектовка',
        qc: 'Контроль качества (ОТК)',
        packing: 'Упаковка',
        shipping: 'Отгрузка'
      };

      const matchedEmp = employees.find(e => e.id === log.employeeId || e.name === log.employeeName);
      const empDisplayName = matchedEmp?.name || (log.employeeName && !log.employeeName.toLowerCase().includes('оператор') && !log.employeeName.toLowerCase().includes('сотрудник') ? log.employeeName : (ord.responsibleEmployeeName || log.employeeName || 'Оператор цеха'));

      const stId = log.stageId as ProductionStageId;
      const count = log.scannedPartsCount || (ord.partsCount || 1);
      const area = log.scannedAreaM2 || Math.round(((ord.totalAreaM2 || 0) / Math.max(ord.partsCount || 1, 1)) * count * 10) / 10;
      const edge = log.scannedEdgeM || Math.round(((ord.totalEdgeM || 0) / Math.max(ord.partsCount || 1, 1)) * count * 10) / 10;
      const holes = count * 6;

      generatedAuditEvents.push({
        id: log.id || `log-${ord.id}-${stId}-${Math.random().toString(36).substr(2, 6)}`,
        employeeId: matchedEmp?.id || log.employeeId || 'unknown',
        employeeName: empDisplayName,
        orderId: ord.id,
        orderNumber: ord.orderNumber,
        stageId: stId,
        stageName: stageNameMap[stId] || stId,
        timestamp: log.endTime || log.startTime || ord.createdAt || new Date().toISOString(),
        actionDetail: `Выполнение этапа «${stageNameMap[stId] || stId}» (${count} дет.)`,
        volumeText: stId === 'cutting' ? `${area} м²` : stId === 'edging' ? `${edge} п.м.` : stId === 'cnc' ? `${holes} отверст.` : `${count} детал.`,
        volumeM2: area,
        volumeMeters: edge,
        volumeParts: count,
        earnedPrice: stId === 'cutting' ? Math.round(area * cuttingRate) : stId === 'edging' ? Math.round(edge * edgingRate) : stId === 'cnc' ? Math.round(holes * cncRate) : stId === 'packing' ? Math.round((ord.packages?.length || 1) * packingRate) : Math.round(count * 50)
      });
    });
  });

  // Parse order scanning progress into micro audit events
  orders.forEach(ord => {
    if (ord.stageScanningProgress) {
      Object.entries(ord.stageScanningProgress).forEach(([stId, materials]) => {
        Object.entries(materials).forEach(([matName, matData]: [string, any]) => {
          const count = matData.scannedPartIds?.length || 0;
          if (count > 0) {
            const stageNameMap: Record<string, string> = {
              cutting: 'Распил ЛДСП/МДФ',
              edging: 'Кромкооблицовка',
              cnc: 'Присадка / ЧПУ',
              facades: 'Фасадный участок',
              assembly: 'Сборка корпусов',
              packing: 'Упаковка',
              shipping: 'Отгрузка'
            };

            // Estimate operation values
            const area = Math.round(((ord.totalAreaM2 || 0) / Math.max(ord.partsCount || 1, 1)) * count * 10) / 10;
            const edge = Math.round(((ord.totalEdgeM || 0) / Math.max(ord.partsCount || 1, 1)) * count * 10) / 10;
            const holes = count * 6; // ~6 holes per part average

            // Assign responsible employee for stage or fallback to main employee name
            const empName = ord.responsibleEmployeeName || 'Оператор цеха';
            const empObj = employees.find(e => e.name === empName);

            generatedAuditEvents.push({
              id: `evt-${ord.id}-${stId}-${matName}`,
              employeeId: empObj?.id || 'unknown',
              employeeName: empObj?.name || empName,
              orderId: ord.id,
              orderNumber: ord.orderNumber,
              stageId: stId as ProductionStageId,
              stageName: stageNameMap[stId] || stId,
              timestamp: ord.createdAt || new Date().toISOString(),
              actionDetail: `Сканирование деталей (${matName}): ${count} шт.`,
              volumeText: stId === 'cutting' ? `${area} м²` : stId === 'edging' ? `${edge} п.м.` : stId === 'cnc' ? `${holes} отверст.` : `${count} детал.`,
              volumeM2: area,
              volumeMeters: edge,
              volumeParts: count,
              earnedPrice: stId === 'cutting' ? Math.round(area * cuttingRate) : stId === 'edging' ? Math.round(edge * edgingRate) : Math.round(count * 50)
            });
          }
        });
      });
    }

    // Packages shipped events
    if (ord.packages && ord.packages.length > 0) {
      ord.packages.forEach(pkg => {
        if (pkg.isShipped) {
          const shippedEmp = employees.find(e => e.id === ord.shippedByEmployeeId) || employees.find(e => e.name === ord.shippedByEmployeeName);
          generatedAuditEvents.push({
            id: `evt-pkg-${pkg.id}`,
            employeeId: shippedEmp?.id || ord.shippedByEmployeeId || 'unknown',
            employeeName: shippedEmp?.name || ord.shippedByEmployeeName || ord.driverInfo?.driverName || 'Водитель-экспедитор',
            orderId: ord.id,
            orderNumber: ord.orderNumber,
            stageId: 'shipping',
            stageName: 'Отгрузка и погрузка',
            timestamp: pkg.shippedAt || ord.shippedAt || new Date().toISOString(),
            actionDetail: `Отгрузка места #${pkg.packageNumber} (${pkg.name})`,
            volumeText: '1 место',
            earnedPrice: packingRate
          });
        }
      });
    }
  });

  // Production Macro Totals
  const totalAreaM2 = filteredOrders.reduce((sum, o) => sum + (o.totalAreaM2 || 0), 0);
  const totalEdgeM = filteredOrders.reduce((sum, o) => sum + (o.totalEdgeM || 0), 0);
  const totalParts = filteredOrders.reduce((sum, o) => sum + (o.partsCount || 0), 0);
  const totalSheetsEstimate = Math.ceil(totalAreaM2 / 5.8); // 1 sheet ~ 5.8 m²
  const totalCncHoles = Math.round(totalParts * 6.5);
  const totalPackagesPacked = filteredOrders.reduce((sum, o) => sum + (o.packages?.length || 0), 0);
  const totalShippedOrders = filteredOrders.filter(o => o.status === 'shipped' || o.status === 'completed').length;

  // Employee Specific Calculations (exclude outsource employees from internal piecework report)
  const productionEmployees = employees.filter(e => e.isProductionEmployee !== false && e.employmentType !== 'outsource');

  const employeeStats = productionEmployees.map(emp => {
    const empNameFirst = emp.name ? emp.name.toLowerCase().split(' ')[0] : '';
    const empEvents = generatedAuditEvents.filter(e => e.employeeId === emp.id || (e.employeeName && empNameFirst && e.employeeName.toLowerCase().includes(empNameFirst)));

    // Specific Stage Volumes
    let cuttingM2 = 0;
    let edgingM = 0;
    let cncHoles = 0;
    let assemblyParts = 0;
    let packedPackages = 0;
    let shippedOrdersCount = 0;
    const orderSet = new Set<string>();

    empEvents.forEach(e => {
      orderSet.add(e.orderId);
      if (e.stageId === 'cutting') cuttingM2 += e.volumeM2 || 0;
      if (e.stageId === 'edging') edgingM += e.volumeMeters || 0;
      if (e.stageId === 'cnc') cncHoles += (e.volumeParts || 0) * 6;
      if (e.stageId === 'assembly') assemblyParts += e.volumeParts || 0;
      if (e.stageId === 'packing') packedPackages += e.volumeParts || 1;
      if (e.stageId === 'shipping') shippedOrdersCount += 1;
    });

    // Fallback if events were empty
    if (empEvents.length === 0) {
      filteredOrders.forEach(o => {
        if (o.responsibleEmployeeName && o.responsibleEmployeeName.toLowerCase().includes(empNameFirst)) {
          orderSet.add(o.id);
          cuttingM2 += o.totalAreaM2 || 0;
          edgingM += o.totalEdgeM || 0;
          cncHoles += (o.partsCount || 0) * 6;
          assemblyParts += o.partsCount || 0;
          packedPackages += o.packages?.length || 1;
        }
      });
    }

    const totalSheets = Math.round((cuttingM2 / 5.8) * 10) / 10;
    const totalPieceworkEarned = Math.round(
      (cuttingM2 * cuttingRate) +
      (edgingM * edgingRate) +
      (cncHoles * cncRate) +
      (assemblyParts * (assemblyRate / 10)) +
      (packedPackages * packingRate) +
      (shippedOrdersCount * shippingRate)
    );

    return {
      employee: emp,
      ordersWorkedCount: orderSet.size,
      eventsCount: Math.max(empEvents.length, orderSet.size),
      cuttingM2: Math.round(cuttingM2 * 10) / 10,
      cuttingSheets: totalSheets,
      edgingM: Math.round(edgingM * 10) / 10,
      cncHoles,
      assemblyParts,
      packedPackages,
      shippedOrdersCount,
      totalPieceworkEarned
    };
  });

  return (
    <div className="space-y-6">
      {/* Top Header Banner */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">
            <BarChart3 className="w-4 h-4" /> Аналитика выработки и производственный учет
          </div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900">
            Детальные отчеты цеха и мастеров
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Учет выработки по участкам (м², листы, п.м., присадка, упаковка) с хронологией сканирований вплоть до каждого сотрудника
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Period Filter Selector */}
          <div className="flex items-center p-1 bg-slate-100 rounded-2xl border border-slate-200">
            <button
              onClick={() => setPeriod('day')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                period === 'day' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              За день
            </button>
            <button
              onClick={() => setPeriod('week')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                period === 'week' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              За неделю
            </button>
            <button
              onClick={() => setPeriod('month')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                period === 'month' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              За месяц
            </button>
            <button
              onClick={() => setPeriod('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                period === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Весь период
            </button>
          </div>

          <button 
            onClick={() => window.print()}
            className="px-4 py-2 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" /> Печать
          </button>
        </div>
      </div>

      {/* Main Section Navigation Tabs */}
      <div className="bg-white rounded-3xl p-2 border border-slate-200/80 shadow-sm flex items-center gap-2 overflow-x-auto">
        <button
          onClick={() => setReportTab('factory')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            reportTab === 'factory' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Factory className="w-4 h-4" />
          <span>Сводные показатели производства</span>
        </button>

        <button
          onClick={() => setReportTab('employees')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            reportTab === 'employees' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Выработка по сотрудникам</span>
        </button>

        <button
          onClick={() => setReportTab('timeline')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            reportTab === 'timeline' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Хронометраж & Лог сканирований</span>
        </button>
      </div>

      {/* TAB 1: MACRO FACTORY STATS */}
      {reportTab === 'factory' && (
        <div className="space-y-6">
          {/* KPI Macro Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* 1. Cutting Area & Sheets */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm hover:border-blue-300 transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-extrabold text-blue-600 uppercase tracking-wider">Распил ЛДСП/МДФ</span>
                <Scissors className="w-5 h-5 text-blue-500" />
              </div>
              <div className="text-3xl font-black text-slate-900 mb-1">
                {totalAreaM2.toFixed(1)} <span className="text-xs font-bold text-slate-400">м²</span>
              </div>
              <div className="text-xs text-slate-600 font-bold flex items-center justify-between pt-2 border-t border-slate-100">
                <span>Объем в листах:</span>
                <span className="font-mono font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">
                  ~{totalSheetsEstimate} листов
                </span>
              </div>
            </div>

            {/* 2. Edging Meters */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm hover:border-indigo-300 transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-extrabold text-indigo-600 uppercase tracking-wider">Кромкооблицовка</span>
                <Layers className="w-5 h-5 text-indigo-500" />
              </div>
              <div className="text-3xl font-black text-slate-900 mb-1">
                {totalEdgeM.toFixed(1)} <span className="text-xs font-bold text-slate-400">п.м.</span>
              </div>
              <div className="text-xs text-slate-600 font-bold flex items-center justify-between pt-2 border-t border-slate-100">
                <span>Кромка ПВХ/ABS:</span>
                <span className="font-mono font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">
                  {Math.round(totalEdgeM * 1.1)} м расхода
                </span>
              </div>
            </div>

            {/* 3. CNC Drillings */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm hover:border-purple-300 transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-extrabold text-purple-600 uppercase tracking-wider">Присадка ЧПУ</span>
                <Factory className="w-5 h-5 text-purple-500" />
              </div>
              <div className="text-3xl font-black text-slate-900 mb-1">
                {totalCncHoles} <span className="text-xs font-bold text-slate-400">отверст.</span>
              </div>
              <div className="text-xs text-slate-600 font-bold flex items-center justify-between pt-2 border-t border-slate-100">
                <span>Обработано деталей:</span>
                <span className="font-mono font-black text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-100">
                  {totalParts} деталей
                </span>
              </div>
            </div>

            {/* 4. Packages & Shipped */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm hover:border-emerald-300 transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-extrabold text-emerald-600 uppercase tracking-wider">Упаковка & Отгрузка</span>
                <Truck className="w-5 h-5 text-emerald-500" />
              </div>
              <div className="text-3xl font-black text-slate-900 mb-1">
                {totalShippedOrders} <span className="text-xs font-bold text-slate-400">заказов</span>
              </div>
              <div className="text-xs text-slate-600 font-bold flex items-center justify-between pt-2 border-t border-slate-100">
                <span>Упаковано мест:</span>
                <span className="font-mono font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
                  {totalPackagesPacked} мест
                </span>
              </div>
            </div>

          </div>

          {/* Department Breakdown Bar Visualization */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
              Загрузка участков и выработка за выбранный период
            </h3>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-bold mb-1.5">
                  <span className="text-slate-700 flex items-center gap-1.5"><Scissors className="w-4 h-4 text-blue-600" /> Участок раскроя (Распил)</span>
                  <span className="font-mono text-slate-900">{totalAreaM2.toFixed(1)} м² (~{totalSheetsEstimate} листов)</span>
                </div>
                <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                  <div className="bg-blue-600 h-full rounded-full" style={{ width: '85%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1.5">
                  <span className="text-slate-700 flex items-center gap-1.5"><Layers className="w-4 h-4 text-indigo-600" /> Кромкооблицовка</span>
                  <span className="font-mono text-slate-900">{totalEdgeM.toFixed(1)} п.м.</span>
                </div>
                <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                  <div className="bg-indigo-600 h-full rounded-full" style={{ width: '72%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1.5">
                  <span className="text-slate-700 flex items-center gap-1.5"><Factory className="w-4 h-4 text-purple-600" /> Присадка ЧПУ</span>
                  <span className="font-mono text-slate-900">{totalCncHoles} операций присадки</span>
                </div>
                <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                  <div className="bg-purple-600 h-full rounded-full" style={{ width: '64%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1.5">
                  <span className="text-slate-700 flex items-center gap-1.5"><Package className="w-4 h-4 text-orange-600" /> Упаковка и Склад</span>
                  <span className="font-mono text-slate-900">{totalPackagesPacked} коробок / мест</span>
                </div>
                <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                  <div className="bg-orange-600 h-full rounded-full" style={{ width: '90%' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DETAILED EMPLOYEE PERFORMANCE TABLE */}
      {reportTab === 'employees' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-slate-900">Выработка мастеров по типам работ</h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Расчет сдельной оплаты труда на основе выполненных операций
                </p>
              </div>

              <div className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                Тарифы: {cuttingRate} ₽/м² (распил), {edgingRate} ₽/п.м. (кромка)
              </div>
            </div>

            {/* Employee Performance Grid */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider bg-slate-50">
                    <th className="py-3 px-4 rounded-l-2xl">Мастер / Сотрудник</th>
                    <th className="py-3 px-4">Должность</th>
                    <th className="py-3 px-4 text-center">Распил (м² / листы)</th>
                    <th className="py-3 px-4 text-center">Кромка (п.м.)</th>
                    <th className="py-3 px-4 text-center">Присадка ЧПУ</th>
                    <th className="py-3 px-4 text-center">Сборка / Детали</th>
                    <th className="py-3 px-4 text-center">Упаковка / Места</th>
                    <th className="py-3 px-4 text-right">Начислено (₽)</th>
                    <th className="py-3 px-4 text-right rounded-r-2xl">Логи</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {employeeStats.map(st => (
                    <tr key={st.employee.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
                            {st.employee.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{st.employee.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">Заказов в работе: {st.ordersWorkedCount}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-bold text-slate-600">
                        {st.employee.productionRole || st.employee.role || 'Оператор'}
                      </td>

                      <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-800">
                        {st.cuttingM2 > 0 ? (
                          <div>
                            <div>{st.cuttingM2} м²</div>
                            <div className="text-[10px] text-blue-600 font-extrabold">({st.cuttingSheets} лист.)</div>
                          </div>
                        ) : '—'}
                      </td>

                      <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-800">
                        {st.edgingM > 0 ? `${st.edgingM} п.м.` : '—'}
                      </td>

                      <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-800">
                        {st.cncHoles > 0 ? `${st.cncHoles} отв.` : '—'}
                      </td>

                      <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-800">
                        {st.assemblyParts > 0 ? `${st.assemblyParts} дет.` : '—'}
                      </td>

                      <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-800">
                        {st.packedPackages > 0 ? `${st.packedPackages} упак.` : '—'}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-black text-emerald-700 text-sm">
                        {st.totalPieceworkEarned.toLocaleString('ru-RU')} ₽
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedEmpForTimeline(st.employee);
                            setReportTab('timeline');
                          }}
                          className="p-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-colors cursor-pointer border border-blue-200"
                          title="Детальный лог хронометража"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: TIMELINE & AUDIT LOG DRILL-DOWN ("Проваливание до времени и сотрудника") */}
      {reportTab === 'timeline' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  Хронологический аудит и лог сканирований
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Проваливание вплоть до конкретного времени, детали, станка и мастера
                </p>
              </div>

              {/* Filter by Employee Selector & Search */}
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={selectedEmpForTimeline?.id || 'all'}
                  onChange={(e) => {
                    const id = e.target.value;
                    if (id === 'all') setSelectedEmpForTimeline(null);
                    else {
                      const emp = employees.find(m => m.id === id);
                      setSelectedEmpForTimeline(emp || null);
                    }
                  }}
                  className="px-3 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Все мастера и сотрудники</option>
                  {productionEmployees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Поиск по заказу, штрихкоду..."
                    value={timelineSearch}
                    onChange={(e) => setTimelineSearch(e.target.value)}
                    className="pl-9 pr-3 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Timeline Audit Event Cards */}
            <div className="space-y-2.5 pt-2">
              {generatedAuditEvents.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  Логи сканирований не найдены за выбранный период.
                </div>
              ) : (
                generatedAuditEvents
                  .filter(evt => {
                    if (selectedEmpForTimeline && evt.employeeId !== selectedEmpForTimeline.id && !evt.employeeName.toLowerCase().includes(selectedEmpForTimeline.name.toLowerCase().split(' ')[0])) {
                      return false;
                    }
                    if (timelineSearch) {
                      const q = timelineSearch.toLowerCase();
                      return evt.orderNumber.toLowerCase().includes(q) || evt.actionDetail.toLowerCase().includes(q) || evt.employeeName.toLowerCase().includes(q);
                    }
                    return true;
                  })
                  .map((evt) => {
                    const timeFormatted = new Date(evt.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                    const dateFormatted = new Date(evt.timestamp).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });

                    return (
                      <div
                        key={evt.id}
                        className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="px-2.5 py-1.5 rounded-xl bg-slate-900 text-emerald-400 font-mono font-bold text-[11px] shrink-0 text-center">
                            <div>{timeFormatted}</div>
                            <div className="text-[9px] text-slate-400">{dateFormatted}</div>
                          </div>

                          <div className="min-w-0 space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-black text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                                Заказ #{evt.orderNumber}
                              </span>
                              <span className="font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                                {evt.stageName}
                              </span>
                            </div>

                            <div className="font-bold text-slate-800 line-clamp-1">{evt.actionDetail}</div>
                            
                            <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
                              <User className="w-3 h-3 text-slate-400" />
                              <span>Исполнитель: <strong className="text-slate-900">{evt.employeeName}</strong></span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0 justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200">
                          <div className="text-right">
                            <div className="font-mono font-black text-slate-900">{evt.volumeText}</div>
                            {evt.earnedPrice && (
                              <div className="text-[10px] font-extrabold text-emerald-600">+{evt.earnedPrice} ₽</div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

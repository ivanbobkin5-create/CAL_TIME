import React, { useState } from 'react';
import { 
  X, 
  Printer, 
  Download, 
  RotateCcw, 
  PackageCheck, 
  Box, 
  Scissors, 
  Layers, 
  Calendar, 
  Truck, 
  User, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  Search, 
  ShieldCheck,
  MapPin,
  ExternalLink,
  Tag
} from 'lucide-react';
import { ProductionOrder, ERPEmployee, OrderPackage } from '../types';
import { formatDeadlineDate, formatDateTimeSafe, formatDateSafe, getStageNameRussian } from '../utils';
import { printArchiveOrderPassport } from '../utils/archivePassportPrinter';
import { printPackageLabelDirect } from '../utils/packageLabelPrinter';

interface ERPArchiveOrderModalProps {
  order: ProductionOrder;
  employees?: ERPEmployee[];
  onClose: () => void;
  onRestoreOrder?: (orderId: string) => void;
}

type ArchiveTab = 'packages' | 'hardware' | 'stages' | 'deviations' | 'birka';

export const ERPArchiveOrderModal: React.FC<ERPArchiveOrderModalProps> = ({
  order,
  employees = [],
  onClose,
  onRestoreOrder
}) => {
  const [activeTab, setActiveTab] = useState<ArchiveTab>('packages');
  const [packageSearch, setPackageSearch] = useState('');
  const [expandedPkgIds, setExpandedPkgIds] = useState<Record<string, boolean>>({});

  const packages = order.packages || [];
  const parts = order.birkaData?.details || [];
  const hardwareItems = order.hardwareData?.items || [];
  const stageProgress = order.stageProgress || {};
  const workLogs = order.workLogs || [];
  const forcedStages = order.forcedStageCompletions || {};

  const pkgsCount = packages.length;
  const shippedPkgsCount = packages.filter(p => p.isShipped).length;
  const isFullyShipped = order.status === 'shipped' || (pkgsCount > 0 && shippedPkgsCount === pkgsCount);

  // Toggle package details card
  const togglePkgExpand = (pkgId: string) => {
    setExpandedPkgIds(prev => ({
      ...prev,
      [pkgId]: prev[pkgId] === undefined ? false : !prev[pkgId]
    }));
  };

  // Expand all / Collapse all packages
  const handleToggleAllPackages = (expand: boolean) => {
    const nextState: Record<string, boolean> = {};
    packages.forEach(p => {
      nextState[p.id] = expand;
    });
    setExpandedPkgIds(nextState);
  };

  // Filtered packages
  const filteredPackages = packages.filter(p => {
    if (!packageSearch.trim()) return true;
    const query = packageSearch.toLowerCase();
    const matchesName = p.name.toLowerCase().includes(query);
    const matchesCode = p.code.toLowerCase().includes(query);
    const matchesParts = p.parts?.some(part => 
      part.name.toLowerCase().includes(query) || 
      part.labelNumber.toLowerCase().includes(query) ||
      (part.material && part.material.toLowerCase().includes(query))
    );
    const matchesHw = p.hardwareItems?.some(h => 
      h.name.toLowerCase().includes(query) || 
      (h.article && h.article.toLowerCase().includes(query))
    );
    return matchesName || matchesCode || matchesParts || matchesHw;
  });

  // Stage names dictionary
  const stageNames: Record<string, { label: string; color: string }> = {
    queue: { label: 'Планирование', color: 'bg-slate-100 text-slate-700 border-slate-200' },
    cutting: { label: 'Распил', color: 'bg-amber-100 text-amber-800 border-amber-200' },
    edging: { label: 'Кромкооблицовка', color: 'bg-blue-100 text-blue-800 border-blue-200' },
    cnc: { label: 'Присадка / ЧПУ', color: 'bg-purple-100 text-purple-800 border-purple-200' },
    milling: { label: 'Присадка / ЧПУ', color: 'bg-purple-100 text-purple-800 border-purple-200' },
    facades: { label: 'Фасады', color: 'bg-pink-100 text-pink-800 border-pink-200' },
    assembly: { label: 'Сборка', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
    kitting: { label: 'Комплектовка', color: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
    qc: { label: 'Контроль ОТК', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
    packing: { label: 'Упаковка', color: 'bg-orange-100 text-orange-800 border-orange-200' },
    packaging: { label: 'Упаковка', color: 'bg-orange-100 text-orange-800 border-orange-200' },
    ready: { label: 'Готово к отгрузке', color: 'bg-teal-100 text-teal-800 border-teal-200' },
    shipping: { label: 'Отгрузка', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' }
  };

  // Hardware completion stats
  const totalHwRequired = hardwareItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const totalHwPacked = hardwareItems.reduce((sum, item) => sum + (item.packedQuantity || 0), 0);
  const hwCompletionPercent = totalHwRequired > 0 ? Math.min(100, Math.round((totalHwPacked / totalHwRequired) * 100)) : 100;

  // Export JSON dossier
  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(order, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `Паспорт_Заказа_${order.orderNumber}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-7xl max-h-[94vh] flex flex-col overflow-hidden">
        
        {/* Modal Top Header */}
        <div className="p-4 sm:p-6 bg-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="px-3 py-1 rounded-xl bg-white/10 text-emerald-300 font-mono font-black text-sm border border-white/15">
                № {order.orderNumber}
              </span>
              {order.salonName && (
                <span className="px-2.5 py-0.5 rounded-lg bg-white/10 text-slate-300 font-bold text-xs">
                  {order.salonName}
                </span>
              )}
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase flex items-center gap-1.5 ${
                isFullyShipped ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
              }`}>
                {isFullyShipped ? <Truck className="w-3.5 h-3.5" /> : <PackageCheck className="w-3.5 h-3.5" />}
                <span>{isFullyShipped ? 'Отгружен водителю' : 'Производство завершено'}</span>
              </span>
            </div>

            <h2 className="text-lg sm:text-xl font-black text-white">
              {order.clientName} {order.projectName ? `— ${order.projectName}` : ''}
            </h2>

            <div className="flex items-center gap-4 text-xs text-slate-400 pt-1 flex-wrap font-medium">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Срок: {formatDeadlineDate(order.deadlineDate)}
              </span>
              {order.shippedAt && (
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <Clock className="w-3.5 h-3.5" />
                  Отгружен: {formatDateTimeSafe(order.shippedAt)}
                </span>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap self-end md:self-center">
            <button
              onClick={() => printArchiveOrderPassport(order, employees)}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
              title="Распечатать официальный архивный паспорт заказа на А4"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Печать паспорта (А4)</span>
              <span className="sm:hidden">Печать А4</span>
            </button>

            <button
              onClick={handleExportJSON}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 border border-slate-700 transition-all cursor-pointer"
              title="Выгрузить полный JSON архив данных"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Экспорт</span>
            </button>

            {onRestoreOrder && (
              <button
                onClick={() => {
                  if (window.confirm(`Вернуть заказ №${order.orderNumber} из архива обратно в производство?`)) {
                    onRestoreOrder(order.id);
                    onClose();
                  }
                }}
                className="px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-xs flex items-center gap-1.5 border border-amber-500/30 transition-all cursor-pointer"
                title="Вернуть заказ в цех на доработку / рекламацию"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>В цех</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer ml-1"
              title="Закрыть архивный паспорт"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick KPI Overview Bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 sm:px-6 py-3 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-xs shrink-0">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Площадь деталей</span>
            <span className="font-black text-slate-900 mt-0.5">{order.totalAreaM2 || 0} м²</span>
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Кромка всего</span>
            <span className="font-black text-slate-900 mt-0.5">{order.totalEdgeM || 0} п.м.</span>
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Всего деталей</span>
            <span className="font-black text-slate-900 mt-0.5">{order.partsCount || 0} шт</span>
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Упаковочные места</span>
            <span className="font-black text-slate-900 mt-0.5">
              {pkgsCount} мест {shippedPkgsCount > 0 && <strong className="text-emerald-600">({shippedPkgsCount} отгр.)</strong>}
            </span>
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Фурнитура (Факт/План)</span>
            <span className="font-black text-slate-900 mt-0.5">
              {totalHwPacked} / {totalHwRequired} шт ({hwCompletionPercent}%)
            </span>
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Водитель / Авто</span>
            <span className="font-bold text-slate-700 mt-0.5 truncate" title={order.driverInfo?.driverName || '—'}>
              {order.driverInfo?.driverName || order.driverInfo?.carPlate || '—'}
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 sm:gap-2 px-3 sm:px-6 pt-2.5 border-b border-slate-200 bg-white overflow-x-auto scrollbar-none shrink-0">
          <button
            onClick={() => setActiveTab('packages')}
            className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-t-2xl font-black text-xs transition-all flex items-center gap-1.5 sm:gap-2 whitespace-nowrap cursor-pointer border-b-2 ${
              activeTab === 'packages'
                ? 'border-orange-600 text-orange-600 bg-orange-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Box className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span>Упаковочные места ({packages.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('hardware')}
            className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-t-2xl font-black text-xs transition-all flex items-center gap-1.5 sm:gap-2 whitespace-nowrap cursor-pointer border-b-2 ${
              activeTab === 'hardware'
                ? 'border-cyan-600 text-cyan-600 bg-cyan-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Tag className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span>Фурнитура и крепеж ({hardwareItems.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('stages')}
            className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-t-2xl font-black text-xs transition-all flex items-center gap-1.5 sm:gap-2 whitespace-nowrap cursor-pointer border-b-2 ${
              activeTab === 'stages'
                ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span>Хронология и исполнители</span>
          </button>

          <button
            onClick={() => setActiveTab('deviations')}
            className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-t-2xl font-black text-xs transition-all flex items-center gap-1.5 sm:gap-2 whitespace-nowrap cursor-pointer border-b-2 ${
              activeTab === 'deviations'
                ? 'border-rose-600 text-rose-600 bg-rose-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span>Отклонения и контроль качества</span>
          </button>

          <button
            onClick={() => setActiveTab('birka')}
            className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-t-2xl font-black text-xs transition-all flex items-center gap-1.5 sm:gap-2 whitespace-nowrap cursor-pointer border-b-2 ${
              activeTab === 'birka'
                ? 'border-emerald-600 text-emerald-600 bg-emerald-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span>Спецификация бирки ({parts.length})</span>
          </button>
        </div>

        {/* Tab Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/50">

          {/* TAB 1: PACKAGES AND CONTENTS */}
          {activeTab === 'packages' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={packageSearch}
                    onChange={(e) => setPackageSearch(e.target.value)}
                    placeholder="Поиск по коробке, коду, деталям..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-medium text-slate-900 text-xs focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                  {packageSearch && (
                    <button
                      onClick={() => setPackageSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    onClick={() => handleToggleAllPackages(true)}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                  >
                    Развернуть все
                  </button>
                  <button
                    onClick={() => handleToggleAllPackages(false)}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                  >
                    Свернуть все
                  </button>
                </div>
              </div>

              {packages.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
                  <Box className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <div className="text-sm font-bold text-slate-700">Упаковочные места не формировались</div>
                  <div className="text-xs text-slate-400 mt-1">Заказ был завершен без создания индивидуальных коробок.</div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {filteredPackages.map((pkg, idx) => {
                    const isExpanded = expandedPkgIds[pkg.id] !== false; // expanded by default
                    const partsCount = pkg.parts?.length || 0;
                    const hwCount = pkg.hardwareItems?.length || 0;

                    return (
                      <div 
                        key={pkg.id} 
                        className="bg-white rounded-2xl border border-slate-200/80 hover:border-orange-300 shadow-2xs transition-all overflow-hidden"
                      >
                        {/* Package Header Card */}
                        <div 
                          onClick={() => togglePkgExpand(pkg.id)}
                          className="p-4 bg-slate-50/70 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer select-none"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                              pkg.isShipped ? 'bg-emerald-600 text-white' : 'bg-orange-600 text-white'
                            }`}>
                              {pkg.packageNumber || idx + 1}
                            </div>

                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-sm font-black text-slate-900">
                                  {pkg.name}
                                </h4>
                                <span className="font-mono text-[11px] px-2 py-0.5 rounded-lg bg-slate-200 text-slate-700 font-bold">
                                  {pkg.code}
                                </span>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                  pkg.isShipped ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                                }`}>
                                  {pkg.isShipped ? '✓ Отгружено' : 'Запечатано'}
                                </span>
                              </div>

                              <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1 flex-wrap">
                                <span>Упаковал: <strong className="text-slate-700">{pkg.createdByEmployeeName || '—'}</strong> ({formatDateTimeSafe(pkg.createdAt)})</span>
                                {pkg.shippedAt && (
                                  <span className="text-emerald-700">
                                    Отгрузил: <strong>{pkg.shippedByEmployeeName || '—'}</strong> ({formatDateTimeSafe(pkg.shippedAt)})
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 self-end md:self-center">
                            <div className="text-right text-xs">
                              {partsCount > 0 && <span className="font-black text-orange-800 bg-orange-100 px-2 py-1 rounded-lg mr-2">{partsCount} дет.</span>}
                              {hwCount > 0 && <span className="font-black text-cyan-800 bg-cyan-100 px-2 py-1 rounded-lg">{hwCount} поз. фурн.</span>}
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                printPackageLabelDirect(order, pkg, packages.length);
                              }}
                              className="p-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-bold flex items-center gap-1 shadow-2xs transition-colors"
                              title="Распечатать термоэтикетку этого места"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Этикетка</span>
                            </button>

                            <div className="text-slate-400 p-1">
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </div>
                          </div>
                        </div>

                        {/* Package Contents Accordion */}
                        {isExpanded && (
                          <div className="p-4 space-y-3 bg-white animate-fade-in">
                            {/* Parts inside box */}
                            {pkg.parts && pkg.parts.length > 0 && (
                              <div>
                                <div className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                                  <Scissors className="w-3.5 h-3.5 text-orange-600" />
                                  <span>Детали корпуса и фасадов ({pkg.parts.length} шт):</span>
                                </div>
                                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                                  <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                                      <tr>
                                        <th className="p-2.5">Позиция</th>
                                        <th className="p-2.5">Наименование</th>
                                        <th className="p-2.5">Материал</th>
                                        <th className="p-2.5">Размеры (ДхШхТ)</th>
                                        <th className="p-2.5 text-right">Кол-во</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {pkg.parts.map(p => (
                                        <tr key={p.detailId} className="hover:bg-slate-50/80">
                                          <td className="p-2.5 font-bold font-mono text-slate-900">{p.labelNumber}</td>
                                          <td className="p-2.5 font-medium text-slate-800">{p.name}</td>
                                          <td className="p-2.5 text-slate-500">{p.material || '—'}</td>
                                          <td className="p-2.5 font-mono text-slate-700">
                                            {p.length && p.width ? `${p.length}×${p.width}${p.thickness ? `×${p.thickness}` : ''} мм` : '—'}
                                          </td>
                                          <td className="p-2.5 text-right font-bold text-slate-900">{p.quantity || 1} шт</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}

                            {/* Hardware inside box */}
                            {pkg.hardwareItems && pkg.hardwareItems.length > 0 && (
                              <div>
                                <div className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                                  <Tag className="w-3.5 h-3.5 text-cyan-600" />
                                  <span>Фурнитура и крепеж в этой коробке:</span>
                                </div>
                                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                                  <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                                      <tr>
                                        <th className="p-2.5">Артикул</th>
                                        <th className="p-2.5">Наименование</th>
                                        <th className="p-2.5">Категория</th>
                                        <th className="p-2.5 text-right">Количество</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {pkg.hardwareItems.map((h, i) => (
                                        <tr key={i} className="hover:bg-slate-50/80">
                                          <td className="p-2.5 font-mono text-slate-700">{h.article || '—'}</td>
                                          <td className="p-2.5 font-bold text-slate-900">{h.name}</td>
                                          <td className="p-2.5 text-slate-500">{h.category || 'Фурнитура'}</td>
                                          <td className="p-2.5 text-right font-black text-cyan-700">{h.quantity} {h.unit || 'шт'}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}

                            {/* Notes if any */}
                            {pkg.customItemsNote && (
                              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                                <strong className="font-bold">Комментарий упаковщика:</strong> {pkg.customItemsNote}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: HARDWARE RECONCILIATION */}
          {activeTab === 'hardware' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-black text-slate-900">
                    Комплектовочная ведомость (План vs Факт)
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Фурнитура, петли, направляющие и крепеж, учтенные сотрудником при комплектации
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-xs font-black text-slate-900">{totalHwPacked} из {totalHwRequired} шт</div>
                    <div className="text-[10px] text-slate-400 font-bold">Укомплектовано ({hwCompletionPercent}%)</div>
                  </div>
                  <div className="w-24 bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200">
                    <div 
                      className={`h-full transition-all ${hwCompletionPercent === 100 ? 'bg-emerald-500' : 'bg-cyan-500'}`}
                      style={{ width: `${hwCompletionPercent}%` }}
                    />
                  </div>
                </div>
              </div>

              {hardwareItems.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
                  <Tag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <div className="text-sm font-bold text-slate-700">Фурнитура не была загружена в заказ</div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-3">Артикул</th>
                        <th className="p-3">Наименование</th>
                        <th className="p-3">Категория</th>
                        <th className="p-3 text-right">По ведомости</th>
                        <th className="p-3 text-right">Уложено в коробки</th>
                        <th className="p-3 text-center">Статус сверки</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {hardwareItems.map(item => {
                        const packed = item.packedQuantity || 0;
                        const isMatch = packed >= item.quantity;
                        return (
                          <tr key={item.id} className="hover:bg-slate-50/80">
                            <td className="p-3 font-mono text-slate-600">{item.article || '—'}</td>
                            <td className="p-3 font-bold text-slate-900">{item.name}</td>
                            <td className="p-3 text-slate-500">{item.category || 'Фурнитура'}</td>
                            <td className="p-3 text-right font-mono text-slate-700">{item.quantity} {item.unit || 'шт'}</td>
                            <td className="p-3 text-right font-mono font-bold text-slate-900">
                              <span className={isMatch ? 'text-emerald-700' : 'text-rose-600'}>
                                {packed} {item.unit || 'шт'}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              {isMatch ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Собрано</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 font-bold text-[11px]">
                                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                                  <span>Нехватка {item.quantity - packed}</span>
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: STAGES TIMELINE AND PARTICIPANTS */}
          {activeTab === 'stages' && (
            <div className="space-y-6">
              {/* Stage Flow */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
                <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  <span>История прохождения технологических участков</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Object.entries(stageNames).map(([stageKey, meta]) => {
                    const stData = stageProgress[stageKey as keyof typeof stageProgress];
                    const isDone = stData?.status === 'done' || 
                                   (stageKey === 'shipping' && (isFullyShipped || order.status === 'shipped' || !!order.shippedAt)) ||
                                   (stageKey === 'packing' && (isFullyShipped || order.status === 'shipped' || order.currentStage === 'shipping' || order.currentStage === 'ready'));
                    const isInProgress = !isDone && (
                      stData?.status === 'in_progress' || 
                      (stageKey === 'shipping' && order.currentStage === 'shipping' && !isFullyShipped) ||
                      (stageKey === 'packing' && order.currentStage === 'packing' && !isDone)
                    );
                    const forced = forcedStages[stageKey];

                    return (
                      <div 
                        key={stageKey}
                        className={`p-4 rounded-2xl border transition-all ${
                          isDone 
                            ? 'bg-emerald-50/60 border-emerald-200' 
                            : (isInProgress ? 'bg-blue-50/60 border-blue-200' : 'bg-slate-50/60 border-slate-200 opacity-60')
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className={`px-2.5 py-1 rounded-xl text-xs font-black border ${meta.color}`}>
                            {meta.label}
                          </span>
                          <span className={`text-[11px] font-black uppercase ${
                            isDone ? 'text-emerald-700' : (isInProgress ? 'text-blue-700' : 'text-slate-400')
                          }`}>
                            {isDone ? '✓ Завершен' : (isInProgress ? 'В работе' : '—')}
                          </span>
                        </div>

                        <div className="space-y-1 text-xs text-slate-600">
                          <div>
                            Исполнитель: <strong className="text-slate-900">{stData?.completedBy || '—'}</strong>
                          </div>
                          <div>
                            Дата завершения: <span className="font-mono text-slate-800">{formatDateTimeSafe(stData?.completedAt)}</span>
                          </div>
                          {stData?.notes && (
                            <div className="text-[11px] text-slate-500 italic pt-1">
                              "{stData.notes}"
                            </div>
                          )}
                          {forced && (
                            <div className="mt-2 p-2 rounded-lg bg-amber-100/70 border border-amber-300 text-[11px] text-amber-900">
                              <strong>⚠️ Досрочно закрыт мастером:</strong> {forced.forcedByEmployeeName}
                              {forced.reason && <div>Причина: {forced.reason}</div>}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Work Logs Journal */}
              {workLogs.length > 0 && (
                <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
                  <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <User className="w-4 h-4 text-emerald-600" />
                    <span>Журнал работы сотрудников над заказом</span>
                  </h4>

                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-3">Сотрудник</th>
                          <th className="p-3">Участок</th>
                          <th className="p-3">Начало работы</th>
                          <th className="p-3">Окончание</th>
                          <th className="p-3 text-right">Выработка</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {workLogs.map((log, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/80">
                            <td className="p-3 font-bold text-slate-900">{log.employeeName}</td>
                            <td className="p-3 text-slate-600">{stageNames[log.stageId]?.label || getStageNameRussian(log.stageId)}</td>
                            <td className="p-3 font-mono text-slate-500">{formatDateTimeSafe(log.startTime)}</td>
                            <td className="p-3 font-mono text-slate-500">{formatDateTimeSafe(log.endTime, 'В процессе')}</td>
                            <td className="p-3 text-right font-black text-slate-900">
                              {log.scannedPartsCount ? `${log.scannedPartsCount} дет.` : ''} {log.scannedAreaM2 ? `${log.scannedAreaM2} м²` : ''} {log.scannedEdgeM ? `${log.scannedEdgeM} м` : ''}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: DEVIATIONS AND QUALITY AUDIT */}
          {activeTab === 'deviations' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Deviations summary card */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
                  <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Сверка объемов производства (Факт / План)</span>
                  </h4>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="font-bold text-slate-600">Количество деталей по проекту:</span>
                      <span className="font-mono font-black text-slate-900">{order.partsCount || 0} шт</span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="font-bold text-slate-600">Упаковано в маркированные места:</span>
                      <span className="font-mono font-black text-emerald-700">
                        {packages.reduce((acc, p) => acc + (p.parts?.length || 0), 0)} шт
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="font-bold text-slate-600">Комплектация фурнитуры:</span>
                      <span className={`font-mono font-black ${hwCompletionPercent === 100 ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {hwCompletionPercent}% ({totalHwPacked} из {totalHwRequired} шт)
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="font-bold text-slate-600">Статус отгрузки:</span>
                      <span className={`font-black ${isFullyShipped ? 'text-emerald-700' : 'text-blue-700'}`}>
                        {isFullyShipped ? 'Все сформированные места переданы водителю' : 'Заказ на складе'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Defect / Rework items if any */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
                  <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Брак, переделки и рекламации</span>
                  </h4>

                  {order.isDefectReworkOrder || (order.defectItems && order.defectItems.length > 0) ? (
                    <div className="space-y-2">
                      <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 font-bold">
                        Заказ выполнялся как задача переделки брака (Родительский заказ: №{order.parentOrderNumber || '—'})
                      </div>
                      {order.defectItems?.map((d, i) => (
                        <div key={i} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                          <div className="font-bold text-slate-900">{d.labelNumber ? `Деталь №${d.labelNumber}: ` : ''}{d.detailName}</div>
                          <div className="text-slate-500 mt-0.5">Причина брака: {d.reason} (Зафиксировал: {d.reportedByEmployeeName || '—'})</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 text-center text-xs text-slate-400 bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
                      ✓ Брак и рекламации по данному заказу не фиксировались
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: BIRKA DETAILS SPECIFICATION */}
          {activeTab === 'birka' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black text-slate-900">
                    Спецификация деталей (Файл Бирки: {order.birkaData?.fileName || 'Загружен'})
                  </h4>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Всего {parts.length} деталей | Площадь: {order.totalAreaM2 || 0} м² | Кромка: {order.totalEdgeM || 0} п.м.
                  </div>
                </div>
              </div>

              {parts.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
                  <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <div className="text-sm font-bold text-slate-700">Спецификация деталей отсутствует</div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto max-h-[500px]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 sticky top-0 z-10">
                      <tr>
                        <th className="p-3">Поз.</th>
                        <th className="p-3">Наименование</th>
                        <th className="p-3">Материал</th>
                        <th className="p-3">Размеры (ДхШхТ)</th>
                        <th className="p-3">Кромка</th>
                        <th className="p-3 text-right">Кол-во</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parts.map(p => (
                        <tr key={p.id} className="hover:bg-slate-50/80">
                          <td className="p-3 font-mono font-bold text-slate-900">{p.labelNumber}</td>
                          <td className="p-3 font-bold text-slate-800">{p.name}</td>
                          <td className="p-3 text-slate-500">{p.material}</td>
                          <td className="p-3 font-mono text-slate-700">{p.length}×{p.width}×{p.thickness} мм</td>
                          <td className="p-3 text-slate-500 font-mono text-[11px]">
                            {[p.edgeL1, p.edgeL2, p.edgeW1, p.edgeW2].filter(Boolean).join(', ') || '—'}
                          </td>
                          <td className="p-3 text-right font-black text-slate-900">{p.quantity} шт</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between gap-4 shrink-0">
          <div className="text-xs text-slate-400 font-medium hidden sm:block">
            Архивная история хранится бессрочно в защищенном реестре ERP
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() => printArchiveOrderPassport(order, employees)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-600" />
              <span>Распечатать паспорт (А4)</span>
            </button>

            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors cursor-pointer"
            >
              Закрыть
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

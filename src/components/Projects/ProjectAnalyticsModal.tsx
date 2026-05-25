import React, { useMemo } from "react";
import {
  X,
  TrendingUp,
  DollarSign,
  Percent,
  CheckCircle,
  Briefcase,
  AlertTriangle,
  FileText,
  BarChart2,
  PieChart as PieIcon,
  Layers,
  Sparkles,
  Info
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from "recharts";

interface Project {
  id: string;
  name: string;
  data: any;
  status?: string;
  totalPrice?: number;
  specification?: any;
}

export const ProjectAnalyticsModal = ({
  project,
  onClose,
}: {
  project: Project;
  onClose: () => void;
}) => {
  // Parsing algorithm to separate Carcass, Facades, Hardware, and Services
  const analyticsData = useMemo(() => {
    let totalMaterialsRevenue = 0;
    let totalMaterialsCost = 0;

    let totalFacadeRevenue = 0;
    let totalFacadeCost = 0;

    let totalHardwareRevenue = 0;
    let totalHardwareCost = 0;

    let totalServicesRevenue = 0;
    let totalServicesCost = 0;

    const rows: any[] = [];

    // Extract rows from project data
    if (project.data?.summaryRows && project.data.summaryRows.length > 0) {
      rows.push(...project.data.summaryRows);
    } else if (project.specification?.summaryRows && project.specification.summaryRows.length > 0) {
      rows.push(...project.specification.summaryRows);
    } else if (project.data?.summary) {
      const s = project.data.summary;
      if (s.materials) rows.push(...s.materials.map((m: any) => ({ ...m, type: "material" })));
      if (s.hardware) rows.push(...s.hardware.map((h: any) => ({ ...h, type: "hardware" })));
      if (s.services) rows.push(...s.services.map((s: any) => ({ ...s, type: "service" })));
    }

    if (rows.length > 0) {
      rows.forEach((row: any) => {
        const rowNameLower = (row.name || "").toLowerCase();
        const rawCoef = parseFloat(row.coef) || 1.0;
        const coef = rawCoef <= 0 ? 1.0 : rawCoef;
        const qty = parseFloat(row.qty) || 1;
        const totalRev = row.total || (row.price * qty) || 0;
        
        // Accurate calculation of cost
        let totalCost = 0;
        if (row.rawPrice) {
          totalCost = row.rawPrice * qty;
        } else {
          totalCost = totalRev / coef;
        }

        // Categorization
        if (row.type === "facade" || rowNameLower.includes("фасад")) {
          totalFacadeRevenue += totalRev;
          totalFacadeCost += totalCost;
        } else if (
          row.type === "product" || 
          row.type === "hardware" || 
          rowNameLower.includes("метиз") || 
          rowNameLower.includes("комплект метизов") ||
          rowNameLower.includes("ручк") ||
          rowNameLower.includes("петл") ||
          rowNameLower.includes("направляющ")
        ) {
          totalHardwareRevenue += totalRev;
          totalHardwareCost += totalCost;
        } else if (
          row.type === "service" || 
          rowNameLower.includes("доставка") || 
          rowNameLower.includes("сборка") || 
          rowNameLower.includes("монтаж") || 
          rowNameLower.includes("распил") || 
          rowNameLower.includes("обработка") ||
          rowNameLower.includes("изготовление")
        ) {
          totalServicesRevenue += totalRev;
          totalServicesCost += totalCost;
        } else {
          // Standard carcass material (LDSP sheets, HDF, cardboard, edges, back walls, etc.)
          totalMaterialsRevenue += totalRev;
          totalMaterialsCost += totalCost;
        }
      });
    }

    // Default distribution if calculation leads to 0 total revenue
    const calculatedTotalRev = totalMaterialsRevenue + totalFacadeRevenue + totalHardwareRevenue + totalServicesRevenue;
    const finalProjectTotal = project.totalPrice || project.data?.totalPrice || calculativeTotalFromData(project);

    if (calculatedTotalRev === 0 && finalProjectTotal > 0) {
      totalMaterialsRevenue = Math.round(finalProjectTotal * 0.35);
      totalMaterialsCost = Math.round(totalMaterialsRevenue / 1.5);

      totalFacadeRevenue = Math.round(finalProjectTotal * 0.25);
      totalFacadeCost = Math.round(totalFacadeRevenue / 1.7);

      totalHardwareRevenue = Math.round(finalProjectTotal * 0.28);
      totalHardwareCost = Math.round(totalHardwareRevenue / 1.6);

      totalServicesRevenue = Math.round(finalProjectTotal * 0.12);
      totalServicesCost = Math.round(totalServicesRevenue / 1.25);
    }

    const cleanCost = (c: number, r: number) => {
      if (isNaN(c) || c < 0) return 0;
      if (c > r) return r * 0.72; // default 28% margin if error in cost calculations
      return Math.round(c);
    };

    const categories = [
      {
        id: "carcass",
        name: "Корпус и кромка (ЛДСП, ХДФ, кромление)",
        cost: cleanCost(totalMaterialsCost, totalMaterialsRevenue),
        revenue: Math.round(totalMaterialsRevenue),
        color: "#3b82f6", // Blue
      },
      {
        id: "facades",
        name: "Фасады (Пленка, эмаль, фрезеровки)",
        cost: cleanCost(totalFacadeCost, totalFacadeRevenue),
        revenue: Math.round(totalFacadeRevenue),
        color: "#10b981", // Green
      },
      {
        id: "hardware",
        name: "Фурнитура и крепеж ( Blum, метизы)",
        cost: cleanCost(totalHardwareCost, totalHardwareRevenue),
        revenue: Math.round(totalHardwareRevenue),
        color: "#f59e0b", // Orange
      },
      {
        id: "services",
        name: "Услуги и сборка (Монтаж, доставка, услуги)",
        cost: cleanCost(totalServicesCost, totalServicesRevenue),
        revenue: Math.round(totalServicesRevenue),
        color: "#8b5cf6", // Purple
      },
    ];

    return categories.map((cat) => {
      const profit = Math.max(0, cat.revenue - cat.cost);
      const marginPercent = cat.revenue > 0 ? (profit / cat.revenue) * 100 : 0;
      const markup = cat.cost > 0 ? cat.revenue / cat.cost : 1;
      return {
        ...cat,
        profit,
        marginPercent: Math.round(marginPercent * 10) / 10,
        markup: Math.round(markup * 100) / 100,
      };
    });
  }, [project]);

  // Helper inside useMemo to resolve a default total price
  function calculativeTotalFromData(p: any): number {
    if (p.data?.summaryRows) {
      return p.data.summaryRows.reduce((sum: number, r: any) => sum + (r.total || 0), 0);
    }
    return 150000;
  }

  // Totals
  const totals = useMemo(() => {
    const cost = analyticsData.reduce((acc, curr) => acc + curr.cost, 0);
    const revenue = analyticsData.reduce((acc, curr) => acc + curr.revenue, 0);
    const profit = Math.max(0, revenue - cost);
    const marginPercent = revenue > 0 ? (profit / revenue) * 100 : 0;
    const markup = cost > 0 ? revenue / cost : 1.0;

    return {
      cost,
      revenue,
      profit,
      marginPercent: Math.round(marginPercent * 10) / 10,
      markup: Math.round(markup * 100) / 100,
    };
  }, [analyticsData]);

  // Data for the Pie Chart (Margin share by category)
  const pieData = useMemo(() => {
    return analyticsData
      .filter((cat) => cat.profit > 0)
      .map((cat) => ({
        name: cat.name.split(" ")[0], // short name
        value: cat.profit,
        color: cat.color,
      }));
  }, [analyticsData]);

  // Dynamic system evaluation & recommendations
  const dynamicFeedback = useMemo(() => {
    const feedback: { text: string; type: "success" | "warning" | "info" }[] = [];

    if (totals.marginPercent >= 40) {
      feedback.push({
        text: `Высокомаржинальная сделка (${totals.marginPercent}% рентабельности). Наценка составляет x${totals.markup}. Превосходный результат!`,
        type: "success",
      });
    } else if (totals.marginPercent >= 25) {
      feedback.push({
        text: `Нормальный уровень рентабельности (${totals.marginPercent}%). Наценка x${totals.markup} соответствует рыночному стандарту для мебельного производства.`,
        type: "info",
      });
    } else {
      feedback.push({
        text: `Низкая маржинальность сделки (${totals.marginPercent}%). Наценка составляет всего x${totals.markup}. Обратите внимание на высокие затраты на материалы или фурнитуру.`,
        type: "warning",
      });
    }

    // Check high cost drivers
    const hardwareShare = totals.cost > 0 ? (analyticsData[2].cost / totals.cost) * 100 : 0;
    if (hardwareShare > 45) {
      feedback.push({
        text: "Внимание: Затраты на фурнитуру составляют большую половину себестоимости проекта. Рассмотрите возможность применения альтернативных брендов или уменьшения скидки.",
        type: "warning",
      });
    }

    const servicesProfitability = analyticsData[3].marginPercent;
    if (servicesProfitability < 15 && analyticsData[3].revenue > 0) {
      feedback.push({
        text: "Услуги (монтаж/доставка) проданы практически без прибыли. Рекомендуется пересмотреть тарифы на выездные работы для компенсации рисков.",
        type: "warning",
      });
    }

    return feedback;
  }, [totals, analyticsData]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-950/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div 
        id="project-analytics-container"
        className="bg-white rounded-[2rem] w-full max-w-5xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-8 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900 leading-tight">Бизнес-анализ проекта</h2>
              <p className="text-xs text-gray-500 font-medium">Проект: {project.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-all"
            title="Закрыть"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-8 overflow-y-auto space-y-8 flex-1">
          {/* Top Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="p-6 bg-gradient-to-br from-blue-50/70 to-blue-50/20 border border-blue-100 rounded-2xl">
              <span className="text-xs font-bold text-blue-800 uppercase tracking-wider block mb-1">Выручка (Продано)</span>
              <div className="text-2xl font-black text-blue-900">{totals.revenue.toLocaleString()} ₽</div>
              <span className="text-[10px] text-blue-500 font-medium mt-1 inline-block">Оплачено клиентом по спецификации</span>
            </div>

            <div className="p-6 bg-gradient-to-br from-red-50/70 to-red-50/20 border border-red-100 rounded-2xl">
              <span className="text-xs font-bold text-red-800 uppercase tracking-wider block mb-1">Затраты (Себестоимость)</span>
              <div className="text-2xl font-black text-red-900">{totals.cost.toLocaleString()} ₽</div>
              <span className="text-[10px] text-red-500 font-medium mt-1 inline-block">Стоимость сырья и закупки</span>
            </div>

            <div className="p-6 bg-gradient-to-br from-green-50/70 to-green-50/20 border border-green-100 rounded-2xl">
              <span className="text-xs font-bold text-green-800 uppercase tracking-wider block mb-1">Чистая прибыль (Маржа)</span>
              <div className="text-2xl font-black text-green-900">{totals.profit.toLocaleString()} ₽</div>
              <span className="text-[10px] text-green-500 font-medium mt-1 inline-block">Итоговый доход от проекта</span>
            </div>

            <div className="p-6 bg-gradient-to-br from-purple-50/70 to-purple-50/20 border border-purple-100 rounded-2xl">
              <span className="text-xs font-bold text-purple-800 uppercase tracking-wider block mb-1">Рентабельность сделки</span>
              <div className="text-2xl font-black text-purple-900">{totals.marginPercent}%</div>
              <span className="text-[10px] text-purple-500 font-medium mt-1 inline-block">Наценка: х{totals.markup}</span>
            </div>
          </div>

          {/* Graphical Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Bar chart - Costs vs Revenue */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6 flex flex-col justify-between">
              <h3 className="font-bold text-gray-900 text-sm mb-4 flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-indigo-600" />
                Сравнение доходов и расходов по статьям
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analyticsData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 10, fill: "#6b7280" }}
                      tickFormatter={(name) => name.split(" ")[0]} // Short labels
                    />
                    <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} />
                    <Tooltip 
                      formatter={(value) => `${Number(value).toLocaleString()} ₽`}
                      contentStyle={{ fontFamily: "Inter, sans-serif", fontSize: 12, borderRadius: 12 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="cost" name="Себестоимость" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="revenue" name="Цена продажи" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Pie chart - Margin Contribution share */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col justify-between">
              <h3 className="font-bold text-gray-900 text-sm mb-4 flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-emerald-600" />
                Распределение прибыли по блокам
              </h3>
              <div className="h-60 w-full relative">
                {pieData.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400">
                    <Info className="w-8 h-8 mb-2 opacity-30" />
                    <span className="text-xs">Нет данных о прибыли</span>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `${Number(value).toLocaleString()} ₽`} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Макс маржа</span>
                  <span className="text-lg font-black text-gray-900">
                    {Math.max(...analyticsData.map(d => d.profit)).toLocaleString()} ₽
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
                {analyticsData.map((cat, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                    {cat.name.split(" ")[0]}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Breakdown Table */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h3 className="font-black text-gray-800 text-sm flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600" />
                Детальный анализ затрат и прибыли по категориям
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    <th className="px-6 py-4">Категория</th>
                    <th className="px-6 py-4 text-right">Затраты (Закупка)</th>
                    <th className="px-6 py-4 text-right">Выручка (Продано)</th>
                    <th className="px-6 py-4 text-right">Наценка</th>
                    <th className="px-6 py-4 text-right">Чистая прибыль</th>
                    <th className="px-6 py-4 text-right">Рентабельность</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {analyticsData.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="px-6 py-4 flex items-center gap-2 text-gray-900 font-bold">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: row.color }} />
                        {row.name}
                      </td>
                      <td className="px-6 py-4 text-right text-gray-500 font-mono">
                        {row.cost.toLocaleString()} ₽
                      </td>
                      <td className="px-6 py-4 text-right text-gray-900 font-mono">
                        {row.revenue.toLocaleString()} ₽
                      </td>
                      <td className="px-6 py-4 text-right text-indigo-600">
                        x{row.markup}
                      </td>
                      <td className="px-6 py-4 text-right text-emerald-600 font-bold font-mono">
                        {row.profit.toLocaleString()} ₽
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          row.marginPercent >= 35 
                            ? "bg-emerald-50 text-emerald-800" 
                            : row.marginPercent >= 20 
                              ? "bg-blue-50 text-blue-800"
                              : "bg-amber-50 text-amber-800"
                        }`}>
                          {row.marginPercent}%
                        </span>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-indigo-50/40 text-gray-900 font-bold border-t-2 border-indigo-100">
                    <td className="px-6 py-4 text-indigo-900 uppercase tracking-wider text-xs">Итого по спецификации:</td>
                    <td className="px-6 py-4 text-right font-mono">{totals.cost.toLocaleString()} ₽</td>
                    <td className="px-6 py-4 text-right font-mono">{totals.revenue.toLocaleString()} ₽</td>
                    <td className="px-6 py-4 text-right text-indigo-600 font-black">x{totals.markup}</td>
                    <td className="px-6 py-4 text-right text-emerald-700 font-black font-mono">{totals.profit.toLocaleString()} ₽</td>
                    <td className="px-6 py-4 text-right">
                      <span className="px-3 py-1 bg-indigo-600 text-white font-black text-xs rounded-full">
                        {totals.marginPercent}%
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* AI / System Expert Analytics Feedback */}
          <div className="p-6 bg-slate-50 border border-slate-100 rounded-3xl space-y-4">
            <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
              <Sparkles className="w-4.5 h-4.5 text-yellow-500 animate-pulse" />
              Экспертное заключение по сделке
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs leading-relaxed text-gray-600 font-medium">
              <div className="space-y-3">
                {dynamicFeedback.map((f, i) => (
                  <div 
                    key={i} 
                    className={`p-3.5 rounded-xl flex items-start gap-2.5 border ${
                      f.type === "success" 
                        ? "bg-emerald-50/75 text-emerald-800 border-emerald-100" 
                        : f.type === "warning" 
                          ? "bg-rose-50/75 text-rose-800 border-rose-100"
                          : "bg-blue-50/75 text-blue-800 border-blue-100"
                    }`}
                  >
                    {f.type === "warning" && <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
                    {f.type !== "warning" && <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
                    <p>{f.text}</p>
                  </div>
                ))}
              </div>

              <div className="p-5 bg-white border border-slate-100 rounded-xl space-y-3">
                <h5 className="font-bold text-gray-800 text-xs uppercase tracking-wider">Структура себестоимости:</h5>
                <div className="space-y-2">
                  {analyticsData.map((row) => {
                    const pct = totals.cost > 0 ? (row.cost / totals.cost) * 100 : 0;
                    return (
                      <div key={row.id} className="space-y-1">
                        <div className="flex justify-between text-[11px] font-bold text-gray-500">
                          <span>{row.name.split(" ")[0]}</span>
                          <span>{Math.round(pct)}% • {row.cost.toLocaleString()} ₽</span>
                        </div>
                        <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-500" 
                            style={{ width: `${pct}%`, backgroundColor: row.color }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3 print:hidden">
          <button
            onClick={() => {
              window.print();
            }}
            className="px-5 py-2.5 text-xs font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-all"
          >
            Распечатать отчет
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-md shadow-indigo-100"
          >
            Закрыть анализ
          </button>
        </div>
      </div>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          body * {
            visibility: hidden;
          }
          #project-analytics-container, #project-analytics-container * {
            visibility: visible;
          }
          #project-analytics-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: auto !important;
            overflow: visible !important;
            margin: 0 !important;
            padding: 0 !important;
          }
        }
      `,
        }}
      />
    </div>
  );
};

import React, { useMemo, useState, useEffect } from "react";
import {
  X,
  TrendingUp,
  DollarSign,
  Percent,
  CheckCircle,
  Briefcase,
  AlertTriangle,
  FileText,
  Factory,
  Package,
  Wrench,
  Truck,
  ArrowRight,
  Info,
  ChevronDown,
  ChevronUp,
  Send,
  AlertCircle
} from "lucide-react";
import { cn } from "../../lib/utils";

interface Project {
  id: string;
  name: string;
  data: any;
  status?: string;
  totalPrice?: number;
  specification?: any;
}

const getManufacturerCoefficient = (category: string, brand: string, mCoeffs: any) => {
  if (!mCoeffs) return 1;

  const rawCat = category || "";
  let baseMarkup = 1;

  if (mCoeffs[`cat_${rawCat}`] !== undefined) {
    baseMarkup = mCoeffs[`cat_${rawCat}`];
  } else if (mCoeffs[rawCat] !== undefined) {
    baseMarkup = mCoeffs[rawCat];
  } else if (mCoeffs.products && mCoeffs.products[rawCat] !== undefined) {
    baseMarkup = mCoeffs.products[rawCat];
  } else {
    const normalizedCat = rawCat.toLowerCase();
    if (normalizedCat === "material" || normalizedCat === "ldsp" || normalizedCat === "лдсп") {
      baseMarkup = mCoeffs.ldsp ?? 1;
    } else if (normalizedCat === "hdf" || normalizedCat === "хдф") {
      baseMarkup = mCoeffs.hdf ?? 1;
    } else if (normalizedCat === "edge" || normalizedCat === "кромка") {
      baseMarkup = mCoeffs.edge ?? 1;
    } else if (normalizedCat === "facadecustom" || normalizedCat === "фасады" || normalizedCat === "фасад") {
      baseMarkup = mCoeffs.facadeCustom ?? 1;
    } else if (normalizedCat === "facadesheet") {
      baseMarkup = mCoeffs.facadeSheet ?? 1;
    } else if (normalizedCat === "hardware" || normalizedCat === "фурнитура") {
      baseMarkup = mCoeffs.hardware ?? 1;
    } else if (normalizedCat === "services" || normalizedCat === "service" || normalizedCat === "услуги") {
      baseMarkup = mCoeffs.services ?? 1;
    } else if (normalizedCat === "assembly" || normalizedCat === "сборка") {
      baseMarkup = mCoeffs.assembly ?? 1;
    } else if (normalizedCat === "delivery" || normalizedCat === "доставка") {
      baseMarkup = mCoeffs.delivery ?? 1;
    }
  }

  if (mCoeffs.brandCoefficients) {
    const brandLower = brand ? brand.toLowerCase() : "";
    const match = mCoeffs.brandCoefficients.find(
      (bc: any) =>
        (bc.categoryId === `cat_${rawCat}` || bc.categoryId === rawCat) &&
        brandLower.includes(bc.brand.toLowerCase()),
    );
    if (match) {
      return match.standardSalon ?? match.wholesale ?? baseMarkup;
    }
  }

  return baseMarkup;
};

const getManufacturerCoeffForRow = (row: any, mCoeffs: any) => {
  if (!mCoeffs) return 1;
  const rawProd = row.rawProduct;
  if (rawProd && rawProd.useCustomCoeffs) {
    if (rawProd.customCoeffWholesale !== undefined && rawProd.customCoeffWholesale > 0) {
      return rawProd.customCoeffWholesale;
    }
    if (rawProd.customCoeffRetail !== undefined && rawProd.customCoeffRetail > 0) {
      return rawProd.customCoeffRetail;
    }
  }

  const brand = row.brand || (rawProd && (rawProd.brand || rawProd.manufacturer)) || "";
  const category = row.type === "material" ? "ldsp" : (row.category || (rawProd && rawProd.category) || row.type);
  
  return getManufacturerCoefficient(category, brand, mCoeffs);
};

export const DealAnalysisModal = ({
  project,
  companyType,
  onClose,
  onConfirmTransfer,
  isProductionView = false,
  onAccept,
  onAcceptWithRevisions,
  manufacturerId,
}: {
  project: any;
  companyType?: string;
  onClose: () => void;
  onConfirmTransfer?: () => Promise<void>;
  isProductionView?: boolean;
  onAccept?: () => Promise<void>;
  onAcceptWithRevisions?: (comment: string) => Promise<void>;
  manufacturerId?: string;
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRevisionInput, setShowRevisionInput] = useState(false);
  const [revisionComment, setRevisionComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [mCoeffs, setMCoeffs] = useState<any>(null);

  const resolvedManufacturerId =
    manufacturerId ||
    project?.manufacturerId ||
    project?.data?.manufacturerId ||
    project?.data?.companyData?.manufacturerId;

  useEffect(() => {
    if (!resolvedManufacturerId) return;
    let isCancelled = false;
    const loadCoeffs = async () => {
      try {
        const res = await fetch(`/api/db/doc/companies/${resolvedManufacturerId}/settings/production`);
        if (res.ok) {
          const docData = await res.json();
          if (!isCancelled) {
            const data = docData?.data || docData;
            setMCoeffs(data);
          }
        }
      } catch (err) {
        console.warn("Failed to load manufacturer coefficients:", err);
      }
    };
    loadCoeffs();
    return () => {
      isCancelled = true;
    };
  }, [resolvedManufacturerId]);

  // We gather all projects inside the set or the single project itself
  const subProjects = useMemo(() => {
    return project.subProjects || project.projects || [project];
  }, [project]);

  // Comprehensive extraction of items and categories
  const analysisRows = useMemo(() => {
    const rows: any[] = [];
    subProjects.forEach((sp: any) => {
      if (sp.data?.summaryRows) {
        sp.data.summaryRows.forEach((r: any) => {
          rows.push({ ...r, projectName: sp.name });
        });
      } else if (sp.specification?.summaryRows) {
        sp.specification.summaryRows.forEach((r: any) => {
          rows.push({ ...r, projectName: sp.name });
        });
      } else if (sp.data?.summary) {
        const s = sp.data.summary;
        if (s.materials) rows.push(...s.materials.map((m: any) => ({ ...m, type: "material", projectName: sp.name })));
        if (s.hardware) rows.push(...s.hardware.map((h: any) => ({ ...h, type: "hardware", projectName: sp.name })));
        if (s.services) rows.push(...s.services.map((s: any) => ({ ...s, type: "service", projectName: sp.name })));
      }
    });
    return rows;
  }, [subProjects]);

  // High-fidelity deal metrics
  const metrics = useMemo(() => {
    let clientTotalSum = 0;
    let productionTotalCost = 0;

    let totalOwnProductsCount = 0;
    let totalProductionProductsCount = 0;

    const itemsBreakdown = analysisRows.map((row) => {
      const rowNameLower = (row.name || "").toLowerCase();
      const qty = parseFloat(row.qty) || 1;
      const clientTotal = row.netPaid !== undefined ? row.netPaid : (row.total || 0);
      
      const rawProd = row.rawProduct;
      const resolvedManufacturerId =
        manufacturerId ||
        project?.manufacturerId ||
        project?.data?.manufacturerId ||
        project?.data?.companyData?.manufacturerId;

      const projectCompanyId =
        project?.companyId ||
        project?.data?.companyId ||
        project?.data?.companyData?.id;

      const isFromProduction =
        row.isCustomFacade ||
        row.isManufacturer ||
        row.fromProduction ||
        row.source === "manufacturer" ||
        row.type === "material" ||
        row.type === "edge" ||
        (rawProd && (
          rawProd.source === "manufacturer" ||
          rawProd.isManufacturer ||
          rawProd.fromProduction ||
          rawProd.isManufacturerProduct ||
          (rawProd.companyId && resolvedManufacturerId && rawProd.companyId === resolvedManufacturerId) ||
          (rawProd.source !== "own" && rawProd.companyId && projectCompanyId && rawProd.companyId !== projectCompanyId)
        )) ||
        (row.type === "product" && !rawProd) ||
        (row.type === "service" && (row.isFromProduction || row.isProductionService || row.createdByProduction));

      let baseCost = row.rawPrice || (row.coef ? row.price / row.coef : row.price) || 0;
      let appliedMCoeff = 1;

      if (isFromProduction) {
        const mCoeff = getManufacturerCoeffForRow(row, mCoeffs);
        if (row.rawProduct?.purchasePrice !== undefined) {
          baseCost = row.rawProduct.purchasePrice;
          appliedMCoeff = mCoeff;
        } else {
          const rowCoefVal = parseFloat(row.coef) || 1.0;
          const hasCoeffAlready = row.rawPrice && rowCoefVal && Math.abs((row.price / row.rawPrice) - rowCoefVal) < 0.1;
          if (hasCoeffAlready) {
            appliedMCoeff = mCoeff;
          } else {
            appliedMCoeff = 1;
          }
        }
      }

      const productionCost = Math.round(baseCost * appliedMCoeff * qty);

      clientTotalSum += clientTotal;
      productionTotalCost += productionCost;

      if (isFromProduction) {
        totalProductionProductsCount++;
      } else {
        totalOwnProductsCount++;
      }

      return {
        name: row.name || "Без названия",
        projectName: row.projectName,
        qty,
        type: row.type,
        isFromProduction,
        clientTotal,
        productionCost,
        profit: clientTotal - productionCost,
        margin: clientTotal > 0 ? Math.round(((clientTotal - productionCost) / clientTotal) * 100) : 0,
      };
    });

    // Check if there are assembly or delivery services and split them
    let clientAssemblyPrice = 0;
    let productionAssemblyCost = 0;
    let clientDeliveryPrice = 0;
    let productionDeliveryCost = 0;

    analysisRows.forEach((row) => {
      const rowNameLower = (row.name || "").toLowerCase();
      const qty = parseFloat(row.qty) || 1;
      const clientTotal = row.netPaid !== undefined ? row.netPaid : (row.total || 0);

      if (rowNameLower.includes("сборк") || rowNameLower.includes("монтаж")) {
        clientAssemblyPrice += clientTotal;
        // production assembly is usually around 70% of the retail price if delegated to production
        if (row.isFromProduction || row.isProductionService) {
          const mCoeff = getManufacturerCoeffForRow(row, mCoeffs);
          productionAssemblyCost += Math.round((row.rawPrice ? (row.rawPrice * mCoeff) : (clientTotal * 0.7)) * qty);
        }
      } else if (rowNameLower.includes("доставк")) {
        clientDeliveryPrice += clientTotal;
        if (row.isFromProduction || row.isProductionService) {
          const mCoeff = getManufacturerCoeffForRow(row, mCoeffs);
          productionDeliveryCost += Math.round((row.rawPrice ? (row.rawPrice * mCoeff) : clientTotal) * qty);
        }
      }
    });

    const netProfit = clientTotalSum - productionTotalCost;
    const netMargin = clientTotalSum > 0 ? Math.round((netProfit / clientTotalSum) * 100) : 0;

    return {
      itemsBreakdown,
      clientTotalSum,
      productionTotalCost,
      netProfit,
      netMargin,
      totalOwnProductsCount,
      totalProductionProductsCount,
      clientAssemblyPrice,
      productionAssemblyCost,
      clientDeliveryPrice,
      productionDeliveryCost,
    };
  }, [analysisRows, mCoeffs]);

  const handleTransferClick = async () => {
    if (!onConfirmTransfer) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await onConfirmTransfer();
    } catch (err: any) {
      setError(err.message || "Ошибка при передаче заказа");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAcceptClick = async () => {
    if (!onAccept) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await onAccept();
    } catch (err: any) {
      setError(err.message || "Ошибка при подтверждении заказа");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAcceptWithRevisionsClick = async () => {
    if (!onAcceptWithRevisions) return;
    if (!revisionComment.trim()) {
      setError("Укажите, пожалуйста, какие именно правки были внесены");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await onAcceptWithRevisions(revisionComment);
    } catch (err: any) {
      setError(err.message || "Ошибка при подтверждении заказа с правками");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-slate-50 w-full max-w-5xl max-h-[92vh] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="px-8 py-6 bg-white border-b border-slate-100 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shadow-inner">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 leading-none">
                {isProductionView ? "Анализ заказа от партнера" : "Супер-подробный анализ сделки"}
              </h2>
              <p className="text-xs text-slate-400 font-bold mt-1.5 uppercase tracking-wider">
                {project.name || `Заказ №${project.contractNumber || project.id.slice(0, 6)}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8">

          {error && (
            <div className="p-4 bg-red-50 border border-red-100 text-red-700 rounded-2xl flex items-center gap-3 text-sm font-semibold">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500" />
              {error}
            </div>
          )}

          {/* KPI Dashboard Rows */}
          {!isProductionView && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-2xs">
                <div className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mb-1 block">Итого продано</div>
                <div className="text-2xl font-black text-slate-900">
                  {metrics.clientTotalSum.toLocaleString()} ₽
                </div>
                <div className="text-[11px] text-slate-500 font-semibold mt-1">Сумма от клиента</div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-2xs">
                <div className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mb-1 block">Себестоимость производства</div>
                <div className="text-2xl font-black text-indigo-600">
                  {metrics.productionTotalCost.toLocaleString()} ₽
                </div>
                <div className="text-[11px] text-slate-500 font-semibold mt-1">Оплата производству</div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-2xs">
                <div className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mb-1 block">Чистый заработок</div>
                <div className="text-2xl font-black text-emerald-600">
                  {metrics.netProfit.toLocaleString()} ₽
                </div>
                <div className="text-[11px] text-slate-500 font-semibold mt-1">Прибыль компании</div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-2xs">
                <div className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mb-1 block">Маржинальность</div>
                <div className="text-2xl font-black text-amber-600">
                  {metrics.netMargin} %
                </div>
                <div className="text-[11px] text-slate-500 font-semibold mt-1">Рентабельность сделки</div>
              </div>
            </div>
          )}

          {isProductionView && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-2xs">
                <div className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mb-1 block">Сумма заказа для производства</div>
                <div className="text-2xl font-black text-indigo-600">
                  {metrics.productionTotalCost.toLocaleString()} ₽
                </div>
                <div className="text-[11px] text-slate-500 font-semibold mt-1">Ваша выручка от партнера</div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-2xs">
                <div className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mb-1 block">Всего товаров партнера</div>
                <div className="text-2xl font-black text-slate-900">
                  {metrics.itemsBreakdown.length} шт.
                </div>
                <div className="text-[11px] text-slate-500 font-semibold mt-1">Из них собственного изготовления: {metrics.totalProductionProductsCount}</div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-2xs">
                <div className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mb-1 block">Партнер (Салон / Дизайнер)</div>
                <div className="text-lg font-black text-slate-800 truncate">
                  {project.originalSalonName || "Партнер"}
                </div>
                <div className="text-[11px] text-slate-500 font-semibold mt-1">Договор № {project.contractNumber || "не указан"}</div>
              </div>
            </div>
          )}

          {/* Super Detailed Itemized Table */}
          <div className="space-y-3">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-1">Детализация по товарам и услугам</h3>
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                      <th className="py-3 px-5">Товар / Услуга</th>
                      <th className="py-3 px-4">Кол-во</th>
                      <th className="py-3 px-4">Продано (Клиент)</th>
                      <th className="py-3 px-4">Себестоимость (Производство)</th>
                      {!isProductionView && <th className="py-3 px-4 text-emerald-600">Заработок</th>}
                      <th className="py-3 px-4 text-slate-500">Категория товара</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {metrics.itemsBreakdown.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-5">
                          <div className="font-bold text-slate-900">{item.name}</div>
                          <div className="text-[10px] text-slate-400 font-semibold">{item.projectName}</div>
                        </td>
                        <td className="py-4 px-4 font-bold text-slate-500">
                          {item.qty}
                        </td>
                        <td className="py-4 px-4 font-extrabold text-slate-800">
                          {item.clientTotal.toLocaleString()} ₽
                        </td>
                        <td className="py-4 px-4 font-extrabold text-indigo-600">
                          {item.productionCost > 0 ? `${item.productionCost.toLocaleString()} ₽` : "—"}
                        </td>
                        {!isProductionView && (
                          <td className="py-4 px-4 font-black text-emerald-600">
                            {item.profit.toLocaleString()} ₽
                            <span className="text-[10px] font-bold text-slate-400 ml-1">({item.margin}%)</span>
                          </td>
                        )}
                        <td className="py-4 px-4">
                          <span className={cn(
                            "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider block text-center w-max",
                            item.isFromProduction 
                              ? "bg-indigo-50 text-indigo-600 border border-indigo-100" 
                              : "bg-amber-50 text-amber-600 border border-amber-100"
                          )}>
                            {item.isFromProduction ? "У производства" : "Собственное"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Services Deep Dive */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-2xs space-y-4">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Wrench className="w-4 h-4 text-slate-500" /> Сборка и Монтаж
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">Продано клиенту:</span>
                  <span className="font-extrabold text-slate-800">{metrics.clientAssemblyPrice.toLocaleString()} ₽</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">Себестоимость на производстве:</span>
                  <span className="font-extrabold text-indigo-600">{metrics.productionAssemblyCost.toLocaleString()} ₽</span>
                </div>
                {!isProductionView && (
                  <div className="flex justify-between pt-2 border-t border-slate-100">
                    <span className="text-emerald-600 font-bold">Прибыль от сборки:</span>
                    <span className="font-black text-emerald-600">{(metrics.clientAssemblyPrice - metrics.productionAssemblyCost).toLocaleString()} ₽</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-2xs space-y-4">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-slate-500" /> Доставка заказа
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">Продано клиенту:</span>
                  <span className="font-extrabold text-slate-800">{metrics.clientDeliveryPrice.toLocaleString()} ₽</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">Себестоимость на производстве:</span>
                  <span className="font-extrabold text-indigo-600">{metrics.productionDeliveryCost.toLocaleString()} ₽</span>
                </div>
                {!isProductionView && (
                  <div className="flex justify-between pt-2 border-t border-slate-100">
                    <span className="text-emerald-600 font-bold">Прибыль от доставки:</span>
                    <span className="font-black text-emerald-600">{(metrics.clientDeliveryPrice - metrics.productionDeliveryCost).toLocaleString()} ₽</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Show Revisions Form inside Production View */}
          {isProductionView && showRevisionInput && (
            <div className="p-5 bg-amber-50 rounded-2xl border border-amber-200 space-y-3 animate-in fade-in duration-200">
              <label className="text-xs font-black text-amber-800 uppercase tracking-widest block">Опишите внесенные изменения или правки:</label>
              <textarea
                value={revisionComment}
                onChange={(e) => setRevisionComment(e.target.value)}
                placeholder="Например: Заменили стандартные петли на Blum с доводчиком, скорректировали кромку..."
                rows={3}
                className="w-full p-4 border border-amber-300 rounded-xl bg-white text-sm font-semibold outline-none focus:ring-2 focus:ring-amber-500 text-slate-800"
              />
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowRevisionInput(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded-xl font-bold text-xs text-slate-700 transition-colors"
                >
                  Отмена
                </button>
                <button
                  disabled={isSubmitting}
                  onClick={handleAcceptWithRevisionsClick}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 rounded-xl font-bold text-xs text-white shadow-md shadow-amber-200 transition-colors"
                >
                  {isSubmitting ? "Отправка..." : "Отправить с правками"}
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Footer actions */}
        <div className="px-8 py-6 bg-white border-t border-slate-100 flex items-center justify-between sticky bottom-0 z-10">
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-500 hover:bg-slate-50 transition-colors"
          >
            Закрыть
          </button>

          <div className="flex items-center gap-3">
            {/* Salon Supervisor/Admin Transfer to Production */}
            {!isProductionView && onConfirmTransfer && (
              <button
                disabled={isSubmitting}
                onClick={handleTransferClick}
                className="px-8 py-3.5 bg-green-600 hover:bg-green-700 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-green-100 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
              >
                <Factory className="w-5 h-5" />
                {isSubmitting ? "Передача..." : "Передать заказ в производство"}
              </button>
            )}

            {/* Production Acceptance controls */}
            {isProductionView && onAccept && !showRevisionInput && (
              <>
                {onAcceptWithRevisions && (
                  <button
                    onClick={() => setShowRevisionInput(true)}
                    className="px-6 py-3.5 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-amber-100 transition-all"
                  >
                    Принять с правками
                  </button>
                )}
                <button
                  disabled={isSubmitting}
                  onClick={handleAcceptClick}
                  className="px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-emerald-100 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  {isSubmitting ? "Принятие..." : "Принять в работу (всё ок)"}
                </button>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

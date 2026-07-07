import React, { useState, useMemo, useEffect } from "react";
import {
  X,
  Calendar,
  FileText,
  ChevronDown,
  ChevronUp,
  Package,
  Wrench,
  Truck,
  ClipboardCheck,
  Save,
  ImageIcon,
  Plus,
  Upload,
  PenTool,
  Loader2,
  CreditCard,
  Coins,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { SketchAnnotator } from "./SketchAnnotator";

interface Project {
  id: string;
  name: string;
  data: any;
  createdAt: string;
  totalPrice?: number;
}

// Simple Russian holiday list for 2024/2025 (representative)
const RU_HOLIDAYS = [
  "01-01",
  "01-02",
  "01-03",
  "01-04",
  "01-05",
  "01-06",
  "01-07",
  "01-08", // New Year
  "02-23", // Defender of Fatherland
  "03-08", // Women's Day
  "05-01", // Labor Day
  "05-09", // Victory Day
  "06-12", // Russia Day
  "11-04", // Unity Day
];

const calculateReadyDate = (
  startDate: Date,
  days: number,
  cycle: "working" | "calendar",
) => {
  const result = new Date(startDate);
  if (cycle === "calendar") {
    result.setDate(result.getDate() + days);
    return result;
  }

  let addedDays = 0;
  while (addedDays < days) {
    result.setDate(result.getDate() + 1);
    const dayOfWeek = result.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const dateStr = `${String(result.getMonth() + 1).padStart(2, "0")}-${String(result.getDate()).padStart(2, "0")}`;
    const isHoliday = RU_HOLIDAYS.includes(dateStr);

    if (!isWeekend && !isHoliday) {
      addedDays++;
    }
  }
  return result;
};

export const ProjectSetCheckoutModal = ({
  projects,
  onClose,
  onSave,
  onSaveDraft,
  productionCycle = "working",
  editingSet,
  specificationConfig,
}: {
  projects: Project[];
  onClose: () => void;
  onSave: (data: any) => Promise<void> | void;
  onSaveDraft?: (data: any) => Promise<void> | void;
  productionCycle?: "working" | "calendar";
  editingSet?: any;
  specificationConfig?: any;
}) => {
  const [contractNumber, setContractNumber] = useState(
    editingSet?.contractNumber || editingSet?.data?.contractNumber || "",
  );
  const [contractDate, setContractDate] = useState(
    editingSet?.contractDate || editingSet?.data?.contractDate || new Date().toISOString().split("T")[0],
  );
  const [leadTimeDays, setLeadTimeDays] = useState(
    editingSet?.leadTimeDays || editingSet?.data?.leadTimeDays || 30,
  );
  const [sketches, setSketches] = useState<string[]>(
    editingSet?.sketches || editingSet?.data?.sketches || [],
  );
  const [isSaving, setIsSaving] = useState(false);

  // Payment states
  const [paymentMethod, setPaymentMethod] = useState(
    editingSet?.paymentMethod || editingSet?.data?.paymentMethod || "Наличные"
  );
  const [paymentPartsCount, setPaymentPartsCount] = useState<number>(
    editingSet?.paymentPartsCount || editingSet?.data?.paymentPartsCount || 1
  );
  const [paymentPercentages, setPaymentPercentages] = useState<number[]>(() => {
    if (editingSet?.paymentPercentages) return editingSet.paymentPercentages;
    if (editingSet?.data?.paymentPercentages) return editingSet.data.paymentPercentages;
    return [50];
  });

  const handlePercentageChange = (index: number, val: number) => {
    setPaymentPercentages((prev) => {
      const next = [...prev];
      next[index] = val;
      return next;
    });
  };

  useEffect(() => {
    if (editingSet) {
      console.log("DEBUG: editingSet updated in modal:", editingSet);
      setContractNumber(editingSet.contractNumber || editingSet?.data?.contractNumber || "");
      setContractDate(editingSet.contractDate || editingSet?.data?.contractDate || new Date().toISOString().split("T")[0]);
      setLeadTimeDays(editingSet.leadTimeDays || editingSet?.data?.leadTimeDays || 30);
      setSketches(editingSet.sketches || editingSet?.data?.sketches || []);
      setPaymentMethod(editingSet.paymentMethod || editingSet?.data?.paymentMethod || "Наличные");
      setPaymentPartsCount(editingSet.paymentPartsCount || editingSet?.data?.paymentPartsCount || 1);
      setPaymentPercentages(
        editingSet.paymentPercentages || 
        editingSet?.data?.paymentPercentages || 
        (editingSet.paymentPartsCount === 2 ? [50, 30] : editingSet.paymentPartsCount === 3 ? [40, 30, 20] : editingSet.paymentPartsCount === 4 ? [25, 25, 25, 25] : [50])
      );
    }
  }, [editingSet]);
  const [expandMaterials, setExpandMaterials] = useState(false);
  const [expandHardware, setExpandHardware] = useState(false);
  const [expandServices, setExpandServices] = useState(false);
  const [isAnnotating, setIsAnnotating] = useState(false);
  const [selectedSketchIndex, setSelectedSketchIndex] = useState<number | null>(null);
  const [useSeparateDates, setUseSeparateDates] = useState(false);
  const [useSeparateDelivery, setUseSeparateDelivery] = useState(false);
  const [projectLeadTimeDays, setProjectLeadTimeDays] = useState<
    Record<string, number>
  >(() => {
    const initial: Record<string, number> = {};
    projects.forEach((p) => (initial[p.id] = 30));
    return initial;
  });
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result && typeof ev.target.result === "string") {
          const img = new Image();
          img.onload = () => {
            let width = img.width;
            let height = img.height;
            const maxDim = 800;
            if (width > maxDim || height > maxDim) {
              if (width > height) {
                height *= maxDim / width;
                width = maxDim;
              } else {
                width *= maxDim / height;
                height = maxDim;
              }
            }
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(img, 0, 0, width, height);
              setSketches((prev) => [
                ...prev,
                canvas.toDataURL("image/jpeg", 0.6),
              ]);
            } else {
              setSketches((prev) => [...prev, ev.target!.result as string]);
            }
          };
          img.src = ev.target.result;
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const readyDate = useMemo(() => {
    return calculateReadyDate(
      new Date(contractDate),
      leadTimeDays,
      productionCycle,
    );
  }, [contractDate, leadTimeDays, productionCycle]);

  const summary = useMemo(() => {
    let totalMaterialsPrice = 0;
    let totalHardwarePrice = 0;
    let totalServicesPrice = 0;
    let totalDeliveryPrice = 0;
    let totalAssemblyPrice = 0;
    let totalFacadePrice = 0;
    let totalCustomFacadePrice = 0;

    const materials: any[] = [];
    const hardware: any[] = [];
    const services: any[] = [];

    projects.forEach((p) => {
      if (!p.data) return;
      const rows = p.data.summaryRows;
      if (rows && rows.length > 0) {
        rows.forEach((row: any) => {
          const rowNameLower = (row.name || "").toLowerCase();
          if (
            row.type === "product" ||
            row.type === "product_edge" ||
            row.type === "hardware"
          ) {
            if (row.name === "Комплект метизов") {
              totalMaterialsPrice += row.total || 0;
              materials.push({ ...row, projectName: p.name });
            } else {
              totalHardwarePrice += row.total || 0;
              hardware.push({ ...row, projectName: p.name });
            }
          } else if (row.type === "service") {
            if (rowNameLower.includes("доставка")) {
              if (useSeparateDelivery) {
                totalServicesPrice += row.total || 0;
                services.push({ ...row, projectName: p.name });
              } else {
                totalDeliveryPrice += row.total || 0;
              }
            } else if (rowNameLower.includes("сборк") || rowNameLower.includes("монтаж")) {
              totalAssemblyPrice += row.total || 0;
            } else {
              totalServicesPrice += row.total || 0;
              services.push({ ...row, projectName: p.name });
            }
          } else if (row.type === "facade" || rowNameLower.includes("фасад")) {
             if (rowNameLower.includes("заказн")) {
               totalCustomFacadePrice += row.total || 0;
             } else {
               totalFacadePrice += row.total || 0;
             }
             materials.push({ ...row, projectName: p.name });
          } else {
            totalMaterialsPrice += row.total || 0;
            materials.push({ ...row, projectName: p.name });
          }
        });
      } else {
        // Fallback for older projects without summaryRows
        const results = p.data.results || {};
        const selectedDecor = p.data.selectedDecor || {};
        const edgeToEdge = p.data.edgeToEdge || {};
        const edgeThickness = p.data.edgeThickness || {};
        const edgeDecor = p.data.edgeDecor || {};

        Object.entries(results).forEach(([key, r]: [string, any]) => {
          totalMaterialsPrice += r.totalPrice || 0;
          materials.push({
            projectName: p.name,
            name: r.name || r.type,
            category: r.category,
            brand: (selectedDecor[key] || "Не указан").split("|")[0],
            decor: (selectedDecor[key] || "Не указан"),
            qty: r.area ? `${r.area.toFixed(2)} м²` : (r.details?.length ? `Деталей: ${r.details.length}` : "1 шт"),
            total: r.totalPrice,
            type: "material"
          });

          // Basic edge fallback
          if (r.details) {
            let edgeLen = 0;
            if (edgeToEdge[key] || r.type === "Фасад") {
               edgeLen = r.details.reduce((sum: number, d: any) => sum + (d.width + d.height) * 2, 0) / 1000;
            } else {
               edgeLen = r.details.reduce((sum: number, d: any) => {
                 const s = d.edgeSides || { top: false, bottom: false, left: false, right: false };
                 let sideLen = 0;
                 if (s.top) sideLen += d.width;
                 if (s.bottom) sideLen += d.width;
                 if (s.left) sideLen += d.height;
                 if (s.right) sideLen += d.height;
                 return sum + sideLen;
               }, 0) / 1000;
            }
            if (edgeLen > 0) {
              materials.push({
                projectName: p.name,
                name: "Кромка",
                decor: edgeDecor[key] || "По умолчанию",
                sub: `${edgeThickness[key] || "0.4"} мм`,
                qty: `${Math.ceil(edgeLen)} м`,
                total: 0, // Fallback price unknown
                type: "product_edge"
              });
            }
          }
        });

        (p.data.addedProducts || []).forEach((item: any) => {
          const qty = parseFloat(item.quantity || item.qty || 1) || 1;
          totalHardwarePrice += (item.price || 0) * qty;
          hardware.push({ ...item, qty, projectName: p.name });
        });

        (p.data.addedServices || []).forEach((item: any) => {
          const qty = parseFloat(item.quantity || item.qty || 1) || 1;
          const rowNameLower = (item.name || "").toLowerCase();
          if (rowNameLower.includes("доставка")) {
            if (useSeparateDelivery) {
              totalServicesPrice += (item.price || 0) * qty;
              services.push({ ...item, qty, projectName: p.name });
            } else {
              totalDeliveryPrice += (item.price || 0) * qty;
            }
          } else if (rowNameLower.includes("сборк") || rowNameLower.includes("монтаж")) {
            totalAssemblyPrice += (item.price || 0) * qty;
          } else {
            totalServicesPrice += (item.price || 0) * qty;
            services.push({ ...item, qty, projectName: p.name });
          }
        });

        const serviceData = p.data.serviceData || {};

        if (useSeparateDelivery) {
          if (serviceData.deliveryPrice) {
            totalServicesPrice += serviceData.deliveryPrice;
            services.push({
              name: "Доставка",
              total: serviceData.deliveryPrice,
              price: serviceData.deliveryPrice,
              projectName: p.name,
              qty: 1,
            });
          }
        } else {
          totalDeliveryPrice += serviceData.deliveryPrice || 0;
        }

        if (serviceData.assemblyPrice) {
          totalAssemblyPrice += serviceData.assemblyPrice;
        }
      }
    });

    let overall =
      totalMaterialsPrice +
      totalHardwarePrice +
      totalServicesPrice +
      totalDeliveryPrice +
      totalAssemblyPrice +
      totalFacadePrice +
      totalCustomFacadePrice;

    // If we used the fallback and the sum is different from p.totalPrice, trust p.totalPrice for overall
    const sumOfProjectTotals = projects.reduce(
      (sum, p) => sum + (p.totalPrice || 0),
      0,
    );
    if (
      !projects.every(
        (p) => p.data?.summaryRows && p.data.summaryRows.length > 0,
      ) &&
      sumOfProjectTotals > overall
    ) {
      overall = sumOfProjectTotals;
    }

    return {
      totalMaterialsPrice,
      totalHardwarePrice,
      totalServicesPrice,
      totalDeliveryPrice,
      totalAssemblyPrice,
      totalFacadePrice,
      totalCustomFacadePrice,
      totalOverall: overall,
      materials,
      hardware,
      services,
    };
  }, [projects]);

  const contractSum = useMemo(() => {
    const includes = specificationConfig?.contractSumIncludes ?? {
      materials: true,
      hardware: true,
      services: true,
      delivery: false,
      assembly: false,
    };

    return (
      (includes.materials ? ((summary.totalMaterialsPrice || 0) + (summary.totalFacadePrice || 0) + (summary.totalCustomFacadePrice || 0)) : 0) +
      (includes.hardware ? (summary.totalHardwarePrice || 0) : 0) +
      (includes.services ? (summary.totalServicesPrice || 0) : 0) +
      (includes.delivery ? (summary.totalDeliveryPrice || 0) : 0) +
      (includes.assembly ? (summary.totalAssemblyPrice || 0) : 0)
    );
  }, [summary, specificationConfig]);

  const separateSum = useMemo(() => {
    const totalAll = (
      (summary.totalMaterialsPrice || 0) +
      (summary.totalFacadePrice || 0) +
      (summary.totalCustomFacadePrice || 0) +
      (summary.totalHardwarePrice || 0) +
      (summary.totalServicesPrice || 0) +
      (summary.totalDeliveryPrice || 0) +
      (summary.totalAssemblyPrice || 0)
    );
    return Math.max(0, totalAll - contractSum);
  }, [summary, contractSum]);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-gray-50 w-full max-w-5xl max-h-[90vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden border border-white/20">
        {/* Header */}
        <div className="px-8 py-6 bg-white border-b border-gray-100 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center">
              <ClipboardCheck className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900 leading-none">
                Оформление заказа
              </h2>
              <p className="text-sm text-gray-400 font-medium mt-1">
                Итоговая спецификация для{" "}
                {projects.length === 1
                  ? "проекта"
                  : "комплекта из " + projects.length + " проектов"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-3 hover:bg-gray-100 rounded-2xl text-gray-400 hover:text-gray-900 transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {isAnnotating ? (
          <div className="flex-1 flex flex-col min-h-0 bg-gray-50 p-6 overflow-hidden relative z-20">
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-4">
              Редактор эскиза
            </h3>
            <div className="flex-1 min-h-[500px] relative bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="absolute inset-0 overflow-auto">
                <SketchAnnotator
                  imageUrl={selectedSketchIndex !== null ? sketches[selectedSketchIndex] : ""}
                  onSave={(data) => {
                    if (selectedSketchIndex !== null) {
                        setSketches(prev => {
                            const next = [...prev];
                            next[selectedSketchIndex] = data;
                            return next;
                        });
                    } else {
                        setSketches((prev) => [...prev, data]);
                    }
                    setIsAnnotating(false);
                    setSelectedSketchIndex(null);
                  }}
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => {
                  setIsAnnotating(false);
                  setSelectedSketchIndex(null);
                }}
                className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl font-bold transition-colors"
              >
                Отмена
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              {/* Main Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                    Договор №
                  </label>
                  <input
                    type="text"
                    value={contractNumber}
                    onChange={(e) => setContractNumber(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold shadow-sm"
                    placeholder="11-0326-05"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                    Дата договора
                  </label>
                  <input
                    type="date"
                    value={contractDate}
                    onChange={(e) => setContractDate(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold shadow-sm"
                  />
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                    Срок (дней)
                  </label>

                  {projects.length > 1 && (
                    <div className="flex flex-col gap-2 mb-3">
                      <label className="flex items-center gap-2 text-sm font-bold text-gray-700 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={useSeparateDates}
                          onChange={(e) => setUseSeparateDates(e.target.checked)}
                          className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                        />
                        <span>Указать разные сроки готовности</span>
                      </label>
                      <label className="flex items-center gap-2 text-sm font-bold text-gray-700 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={useSeparateDelivery}
                          onChange={(e) =>
                            setUseSeparateDelivery(e.target.checked)
                          }
                          className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                        />
                        <span>Доставлять проекты отдельно</span>
                      </label>
                    </div>
                  )}

                  {!useSeparateDates || projects.length <= 1 ? (
                    <div className="flex items-center gap-4">
                      <input
                        type="number"
                        value={leadTimeDays}
                        onChange={(e) =>
                          setLeadTimeDays(parseInt(e.target.value) || 0)
                        }
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold shadow-sm"
                      />
                      <div className="flex flex-col min-w-[80px]">
                        <span className="text-[10px] font-black text-gray-900 leading-none">
                          {productionCycle === "working"
                            ? "Раб. дни"
                            : "Кал. дни"}
                        </span>
                        <span className="text-[10px] text-gray-400 mt-0.5">
                          РФ Праздники
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {projects.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center gap-4 bg-gray-50 p-2 rounded-xl border border-gray-100"
                        >
                          <span
                            className="text-xs font-bold text-gray-700 truncate w-1/2"
                            title={p.name}
                          >
                            {p.name}
                          </span>
                          <input
                            type="number"
                            value={projectLeadTimeDays[p.id] || 0}
                            onChange={(e) =>
                              setProjectLeadTimeDays((prev) => ({
                                ...prev,
                                [p.id]: parseInt(e.target.value) || 0,
                              }))
                            }
                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold shadow-sm"
                          />
                        </div>
                      ))}
                      <div className="text-[10px] text-gray-400 mt-1">
                        Расчет в{" "}
                        {productionCycle === "working"
                          ? "рабочих"
                          : "календарных"}{" "}
                        днях
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Resulting Date Display */}
              <div className="p-6 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-[2rem] border border-white flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                    <Calendar className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                      Дата готовности
                    </p>
                    {useSeparateDates && projects.length > 1 ? (
                      <p className="text-sm font-bold text-indigo-900 mt-1">
                        Разные сроки по проектам
                      </p>
                    ) : (
                      <p className="text-2xl font-black text-indigo-900">
                        {readyDate.toLocaleDateString("ru-RU", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 text-right">
                  <div>
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none">
                      Сумма по договору
                    </p>
                    <p className="text-3xl font-black text-indigo-900 mt-1">
                      {contractSum.toLocaleString()} ₽
                    </p>
                  </div>
                  {separateSum > 0 && (
                    <div className="mt-2 border-t border-indigo-200/50 pt-1.5 w-full text-right">
                      <p className="text-[10px] font-black text-indigo-400/80 uppercase tracking-widest leading-none">
                        Оплачивается отдельно
                      </p>
                      <p className="text-lg font-extrabold text-indigo-950 mt-0.5">
                        {separateSum.toLocaleString()} ₽
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Block (Блок оплаты) */}
              <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-8 py-5 border-b border-gray-50 flex items-center justify-between bg-indigo-50/30">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                      <CreditCard className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">
                      Блок оплаты
                    </h3>
                  </div>
                </div>
                <div className="p-8 space-y-6">
                  {/* Payment Method & Splitting trigger */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                        Вид оплаты
                      </label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold shadow-sm"
                      >
                        {["Наличные", "СПБ", "QR-код", "Оплата картой", "Безналичные", "Рассрочка"].map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                        Разбить оплату на части
                      </label>
                      <div className="flex items-center gap-2">
                        {[1, 2, 3, 4].map((parts) => (
                          <button
                            key={parts}
                            type="button"
                            onClick={() => {
                              setPaymentPartsCount(parts);
                              let defaults = [50];
                              if (parts === 2) defaults = [50, 30];
                              else if (parts === 3) defaults = [40, 30, 20];
                              else if (parts === 4) defaults = [25, 25, 25, 25];
                              setPaymentPercentages(defaults);
                            }}
                            className={cn(
                              "flex-1 py-3 text-xs font-black rounded-xl border transition-all",
                              paymentPartsCount === parts
                                ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100"
                                : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                            )}
                          >
                            {parts} {parts === 1 ? "часть" : parts < 5 ? "части" : "частей"}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Payment Parts Inputs */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                    {Array.from({ length: paymentPartsCount }).map((_, idx) => {
                      const pct = paymentPercentages[idx] ?? 0;
                      const amt = Math.round((contractSum * pct) / 100);
                      const title = idx === 0 ? "Предоплата (1-я часть)" : `${idx + 1}-я часть оплаты`;
                      
                      return (
                        <div key={idx} className="p-4 bg-gray-50/50 border border-gray-100 rounded-2xl space-y-3">
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">
                            {title}
                          </span>
                          <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={pct}
                                onChange={(e) => {
                                  const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                                  handlePercentageChange(idx, val);
                                }}
                                className="w-full pl-3 pr-8 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold shadow-sm"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                                %
                              </span>
                            </div>
                          </div>
                          <div className="text-xs text-gray-500 font-bold">
                            Сумма: <span className="text-indigo-600 font-extrabold">{amt.toLocaleString()} ₽</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Balance / Остаток оплаты */}
                  {(() => {
                    const totalPct = paymentPercentages.slice(0, paymentPartsCount).reduce((s, p) => s + p, 0);
                    const totalAmt = paymentPercentages.slice(0, paymentPartsCount).reduce((s, p) => s + Math.round((contractSum * p) / 100), 0);
                    const restPct = Math.max(0, 100 - totalPct);
                    const restAmt = Math.max(0, contractSum - totalAmt);
                    
                    return (
                      <div className="p-5 bg-emerald-50/50 border border-emerald-100 rounded-2xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
                            <Coins className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-emerald-950">
                              Остаток оплаты
                            </h4>
                            <p className="text-xs text-emerald-600 font-medium mt-0.5">
                              Остаток от всех предоплат ({restPct}%)
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-black text-emerald-950">
                            {restAmt.toLocaleString()} ₽
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Breakdown Sections */}
                {/* Materials, Edges and Facades (New Unified Section) */}
                <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
                   <div className="px-8 py-5 border-b border-gray-50 flex items-center gap-3 bg-blue-50/30">
                      <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                         <Package className="w-4 h-4 text-white" />
                      </div>
                      <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">
                         Материалы, кромка и фасады
                      </h3>
                   </div>
                   <div className="p-8 space-y-8">
                     {Object.entries((() => {
                        const groups: Record<string, any> = {};
                        projects.forEach(p => {
                           groups[p.name] = { body: [], back: [], facades: [], hardwareAndOthers: [] };
                        });

                        let lastCategory: "body" | "facades" | "back" | null = null;
                        summary.materials.forEach((m: any) => {
                           const proj = m.projectName;
                           if (!groups[proj]) return;
                           const name = (m.name || "").toLowerCase();
                           const decor = m.decor || m.brand || "Не указан";
                           const sub = m.sub || "";
                           const qty = m.qty || "";
                           
                           if (m.type === "product_edge" || m.type === "edge" || name.includes("кромка")) {
                              const edgeStr = `${m.name}${decor !== "Не указан" ? ` ${decor}` : ""} — ${qty}`;
                              let targetArr = groups[proj].body;
                              if (lastCategory && groups[proj][lastCategory]) {
                                 targetArr = groups[proj][lastCategory];
                              }
                              if (targetArr.length > 0) {
                                 targetArr[targetArr.length - 1] += ` (+ ${edgeStr.trim()})`;
                              } else {
                                 groups[proj].body.push(edgeStr.trim());
                              }
                           } else {
                              const itemStr = `${m.name}${decor !== "Не указан" ? ` ${decor}` : ""}${sub ? ` (${sub})` : ""} — ${qty}`;
                              // Only change category if it's not an edge
                              if (m.type === "facade" || name.includes("фасад")) {
                                 groups[proj].facades.push(itemStr);
                                 lastCategory = "facades";
                              } else if (name.includes("хдф") || name.includes("двп") || (m.sub || "").toLowerCase().includes("задняя")) {
                                 groups[proj].back.push(itemStr);
                                 lastCategory = "back";
                              } else {
                                 groups[proj].body.push(itemStr);
                                 lastCategory = "body";
                              }
                           }
                        });

                        summary.hardware.forEach((h: any) => {
                           const proj = h.projectName;
                           if (!groups[proj]) return;
                           const qty = h.qty || 1;
                           const unit = h.unit || "шт";
                           const itemStr = `${h.display_name || h.name} — ${qty} ${unit}`;
                           groups[proj].hardwareAndOthers.push(itemStr);
                        });

                        return groups;
                     })()).map(([projName, items]: [string, any]) => (
                        <div key={projName} className="space-y-4">
                           <div className="flex items-center gap-2 mb-2">
                              <div className="w-1.5 h-4 bg-blue-500 rounded-full" />
                              <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest">
                                 {projName}
                              </h4>
                           </div>
                           <div className="ml-4 space-y-4">
                              {items.body.length > 0 && (
                                 <div className="mb-2">
                                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest block mb-1">Корпус:</span>
                                    <ul className="list-disc pl-5 text-sm text-gray-700">
                                       {items.body.map((s: string, i: number) => <li key={i}>{s}</li>)}
                                    </ul>
                                 </div>
                              )}
                              {items.back.length > 0 && (
                                 <div className="mb-2">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Задняя стенка:</span>
                                    <ul className="list-disc pl-5 text-sm text-gray-700">
                                       {items.back.map((s: string, i: number) => <li key={i}>{s}</li>)}
                                    </ul>
                                 </div>
                              )}
                              {items.facades.length > 0 && (
                                 <div className="mb-2">
                                    <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest block mb-1">Фасады:</span>
                                    <ul className="list-disc pl-5 text-sm text-gray-700">
                                       {items.facades.map((s: string, i: number) => <li key={i}>{s}</li>)}
                                    </ul>
                                 </div>
                              )}
                               {items.hardwareAndOthers.length > 0 && (
                                 <div className="mb-2">
                                    <span className="text-[10px] font-black text-green-600 uppercase tracking-widest block mb-1">Фурнитура и комплектующие:</span>
                                    <ul className="list-disc pl-5 text-sm text-gray-700">
                                       {items.hardwareAndOthers.map((s: string, i: number) => <li key={i}>{s}</li>)}
                                    </ul>
                                 </div>
                              )}
                           </div>
                        </div>
                     ))}
                   </div>
                </div>

                <div className="space-y-6">

                {/* Services List (Expandable) */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                  <button
                    onClick={() => setExpandServices(!expandServices)}
                    className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                      <Wrench className="w-4 h-4 text-green-500" /> Услуги и
                      работы
                    </h3>
                    {expandServices ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                  {expandServices && (
                    <div className="px-6 pb-6 space-y-4 border-t border-gray-50 pt-4">
                      {Object.entries(
                        summary.services.reduce((acc: any, item: any) => {
                          if (!acc[item.projectName]) acc[item.projectName] = [];
                          acc[item.projectName].push(item);
                          return acc;
                        }, {})
                      ).map(([projName, items]: [string, any]) => (
                        <div key={projName} className="space-y-2">
                          <h4 className="text-[10px] font-black text-green-400 uppercase tracking-widest mb-1">
                            Проект: {projName}
                          </h4>
                          {items.map((item: any, idx: number) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between text-sm py-2 border-b border-gray-50 last:border-0"
                            >
                              <div className="flex flex-col">
                                <span className="font-bold text-gray-800">
                                  {item.name}
                                </span>
                              </div>
                              <div className="flex items-center gap-4 min-w-[120px] justify-end">
                                <span className="text-gray-500 font-medium">
                                  {parseFloat(item.qty || 1)}{" "}
                                  {/шт|м|усл|л./.test(String(item.qty))
                                    ? ""
                                    : item.unit || "усл"}
                                </span>
                                <span className="font-black text-gray-900">
                                  {(
                                    item.total ||
                                    (item.price || 0) * parseFloat(item.qty || 1)
                                  ).toLocaleString()}{" "}
                                  ₽
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Delivery & Assembly Separate */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Truck className="w-5 h-5 text-blue-500" />
                      <span className="text-sm font-bold text-gray-700">
                        Доставка
                      </span>
                    </div>
                    <span className="font-black text-gray-900">
                      {summary.totalDeliveryPrice.toLocaleString()} ₽
                    </span>
                  </div>
                  <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Wrench className="w-5 h-5 text-green-500" />
                      <span className="text-sm font-bold text-gray-700">
                        Сборка
                      </span>
                    </div>
                    <span className="font-black text-gray-900">
                      {summary.totalAssemblyPrice.toLocaleString()} ₽
                    </span>
                  </div>
                </div>
              </div>

              {/* Sketches / Images */}
              <section className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-purple-500" /> Эскизы и
                  визуализации
                </h3>
                <div className="flex flex-wrap gap-4">
                  {sketches.map((url, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        setSelectedSketchIndex(idx);
                        setIsAnnotating(true);
                      }}
                      className="relative group w-32 h-32 rounded-2xl overflow-hidden border border-gray-100 shadow-sm transition-all hover:shadow-md cursor-pointer"
                    >
                      <img
                        src={url}
                        alt={`Sketch ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSketches((prev) =>
                            prev.filter((_, i) => i !== idx),
                          );
                        }}
                        className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                        title="Удалить эскиз"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}

                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                  />

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-32 h-32 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-indigo-400 hover:text-indigo-400 transition-all group hover:bg-indigo-50/30"
                  >
                    <Upload className="w-6 h-6 group-hover:-translate-y-1 transition-transform" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-center px-2">
                      Загрузить с ПК
                    </span>
                  </button>
                </div>
              </section>
            </div>

              {/* Footer */}
              <div className="px-8 py-6 bg-white border-t border-gray-100 flex items-center justify-between gap-4 sticky bottom-0 z-10">
                <button
                  onClick={onClose}
                  disabled={isSaving}
                  className="px-8 py-3 rounded-2xl text-sm font-bold text-gray-500 hover:bg-gray-50 transition-all border border-gray-200 disabled:opacity-50"
                >
                  Отмена
                </button>
                <div className="flex items-center gap-4">
                  {onSaveDraft && (
                    <button
                      disabled={isSaving}
                      onClick={async () => {
                          if (isSaving) return;
                          setIsSaving(true);
                          try {
                            const perProjectDates: Record<string, string> = {};
                            if (useSeparateDates) {
                              Object.entries(projectLeadTimeDays).forEach(
                                ([pId, days]) => {
                                  perProjectDates[pId] = calculateReadyDate(
                                    new Date(contractDate),
                                    days,
                                    productionCycle,
                                  ).toISOString();
                                },
                              );
                            }
                            await onSaveDraft({
                              id: editingSet?.id,
                              contractNumber,
                              contractDate,
                              leadTimeDays,
                              readyDate: useSeparateDates
                                ? null
                                : readyDate.toISOString(),
                              useSeparateDates,
                              perProjectDates,
                              productionCycle,
                              projectIds: projects.map((p) => p.id),
                              sketches,
                              totalPrice: contractSum,
                              summary,
                              paymentMethod,
                              paymentPartsCount,
                              paymentPercentages,
                              paymentAmounts: paymentPercentages.slice(0, paymentPartsCount).map(pct => Math.round((contractSum * pct) / 100)),
                              paymentRestAmount: contractSum - paymentPercentages.slice(0, paymentPartsCount).reduce((s, p) => s + Math.round((contractSum * p) / 100), 0),
                            });
                          } catch (err) {
                            console.error(err);
                          } finally {
                            setIsSaving(false);
                          }
                      }}
                      className="px-8 py-3 rounded-2xl text-sm font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-all border border-indigo-100 flex items-center gap-2 disabled:opacity-50"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Сохранение...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Сохранить
                        </>
                      )}
                    </button>
                  )}
                  <button
                    disabled={isSaving}
                    onClick={async () => {
                      if (isSaving) return;
                      setIsSaving(true);
                      try {
                        const perProjectDates: Record<string, string> = {};
                        if (useSeparateDates) {
                          Object.entries(projectLeadTimeDays).forEach(
                            ([pId, days]) => {
                              perProjectDates[pId] = calculateReadyDate(
                                new Date(contractDate),
                                days,
                                productionCycle,
                              ).toISOString();
                            },
                          );
                        }

                        await onSave({
                          id: editingSet?.id,
                          contractNumber,
                          contractDate,
                          leadTimeDays,
                          readyDate: useSeparateDates
                            ? null
                            : readyDate.toISOString(),
                          useSeparateDates,
                          perProjectDates,
                          productionCycle,
                          projectIds: projects.map((p) => p.id),
                          sketches,
                          totalPrice: contractSum,
                          summary,
                          paymentMethod,
                          paymentPartsCount,
                          paymentPercentages,
                          paymentAmounts: paymentPercentages.slice(0, paymentPartsCount).map(pct => Math.round((contractSum * pct) / 100)),
                          paymentRestAmount: contractSum - paymentPercentages.slice(0, paymentPartsCount).reduce((s, p) => s + Math.round((contractSum * p) / 100), 0),
                        });
                      } catch (err) {
                        console.error(err);
                      } finally {
                        setIsSaving(false);
                      }
                    }}
                    className="px-10 py-4 bg-indigo-600 text-white rounded-2xl text-sm font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Создание спецификации...
                      </>
                    ) : (
                      <>
                        <ClipboardCheck className="w-5 h-5" />
                        Создать спецификацию
                      </>
                    )}
                  </button>
                </div>
              </div>
          </>
        )}
      </div>
    </div>
  );
};

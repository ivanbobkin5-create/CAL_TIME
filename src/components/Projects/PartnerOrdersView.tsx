import React, { useEffect, useState } from "react";
// Custom mock DB setup acting over REST API
const db = {};
function collection(db: any, ...pathParts: string[]) {
  return { path: pathParts.join('/') };
}
function doc(db: any, ...pathParts: string[]) {
  return { path: pathParts.join('/') };
}
async function setDoc(docRef: any, data: any, options?: any) {
  await fetch(`/api/db/doc/${docRef.path}`, {
    method: options?.merge ? 'PATCH' : 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data })
  });
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("meb_sync_completed"));
  }
}
async function updateDoc(docRef: any, data: any, options?: any) {
  await fetch(`/api/db/doc/${docRef.path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data, merge: options?.merge })
  });
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("meb_sync_completed"));
  }
}
function writeBatch(db: any) {
  const operations: any[] = [];
  return {
    set: (ref: any, data: any) => operations.push({ type: 'set', ref, data }),
    update: (ref: any, data: any, options?: any) => operations.push({ type: 'update', ref, data, options }),
    delete: (ref: any) => operations.push({ type: 'delete', ref }),
    commit: async () => {
      await Promise.all(operations.map(async (op) => {
        if (op.type === 'set') await setDoc(op.ref, op.data, op.options);
        if (op.type === 'update') await updateDoc(op.ref, op.data, op.options);
      }));
    }
  };
}
function onSnapshot(ref: any, callback: (snap: any) => void, onError?: (err: any) => void) {
  const isCol = ref.path.split('/').length % 2 !== 0;
  const fetchData = async () => {
    try {
      const url = isCol ? `/api/db/col/${ref.path}` : `/api/db/doc/${ref.path}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (isCol) {
          callback({
            docs: data.map((d: any) => ({
              id: d.id,
              data: () => d.data,
              exists: () => true
            })),
            size: data.length
          });
        } else {
          callback({
            id: ref.path.split('/').pop(),
            data: () => data,
            exists: () => true
          });
        }
      } else {
        if (onError) onError(new Error("Failed to fetch"));
      }
    } catch (e) {
      console.error("Snapshot error:", e);
      if (onError) onError(e);
    }
  };
  
  fetchData();
  
  const interval = setInterval(fetchData, 45000);
  
  const handleSync = () => fetchData();
  if (typeof window !== "undefined") {
    window.addEventListener("meb_sync_completed", handleSync);
  }

  return () => {
    clearInterval(interval);
    if (typeof window !== "undefined") {
      window.removeEventListener("meb_sync_completed", handleSync);
    }
  };
}
function query(ref: any, ...constraints: any[]) { return ref; }
function orderBy(field: string, dir: string) { return {}; }
import {
  FolderOpen,
  Calendar,
  Layers,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Info,
  Loader2,
  Building2,
  Package,
  Eye,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { cn } from "../../lib/utils";
import { DealAnalysisModal } from "./DealAnalysisModal";

interface PartnerOrdersViewProps {
  companyId: string;
  showAlert: (title: string, msg: string) => void;
  showConfirm: (title: string, msg: string, onConfirm: () => void) => void;
}

export const PartnerOrdersView = ({
  companyId,
  showAlert,
  showConfirm
}: PartnerOrdersViewProps) => {
  const [sets, setSets] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<"all" | "pending" | "accepted">("all");
  const [selectedSetForAnalysis, setSelectedSetForAnalysis] = useState<any | null>(null);
  const [expandedSetIds, setExpandedSetIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!companyId) return;

    setIsLoading(true);

    const qSets = query(
      collection(db, "companies", companyId, "partner_sets"),
      orderBy("createdAt", "desc")
    );
    const qProjs = query(
      collection(db, "companies", companyId, "partner_projects"),
      orderBy("createdAt", "desc")
    );

    const unsubscribeSets = onSnapshot(qSets, (snapshot) => {
      const loadedSets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSets(loadedSets);
      setIsLoading(false);
    }, (err) => {
      console.error("Error loading partner sets:", err);
      setIsLoading(false);
    });

    const unsubscribeProjs = onSnapshot(qProjs, (snapshot) => {
      const loadedProjs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProjects(loadedProjs);
    }, (err) => {
      console.error("Error loading partner projects:", err);
    });

    return () => {
      unsubscribeSets();
      unsubscribeProjs();
    };
  }, [companyId]);

  const toggleSetExpand = (setId: string) => {
    setExpandedSetIds(prev => {
      const next = new Set(prev);
      if (next.has(setId)) {
        next.delete(setId);
      } else {
        next.add(setId);
      }
      return next;
    });
  };

  // Filtered sets based on active filter tab
  const filteredSets = sets.filter(s => {
    if (activeFilter === "all") return true;
    if (activeFilter === "pending") return s.status === "pending" || !s.status;
    if (activeFilter === "accepted") return s.status === "accepted" || s.status === "accepted_with_revisions";
    return true;
  });

  // Calculate the production cost for a set based on its projects
  const calculateSetProductionCost = (setRecord: any) => {
    const subProjs = projects.filter(p => p.setId === setRecord.id || setRecord.projectIds?.includes(p.id));
    let totalCost = 0;
    subProjs.forEach(p => {
      const rows = p.data?.summaryRows || p.specification?.summaryRows || [];
      rows.forEach((row: any) => {
        const qty = parseFloat(row.qty) || 1;
        const rawUnitCost = row.rawPrice || (row.coef ? row.price / row.coef : row.price) || 0;
        
        const rawProd = row.rawProduct;
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
            rawProd.isManufacturerProduct
          )) ||
          (row.type === "product" && !rawProd) ||
          (row.type === "service" && (row.isFromProduction || row.isProductionService || row.createdByProduction));

        if (isFromProduction) {
          totalCost += Math.round(rawUnitCost * qty);
        }
      });
    });
    return totalCost;
  };

  // Confirm accept order (as-is)
  const handleAcceptOrder = async (setRecord: any) => {
    setSelectedSetForAnalysis(null);
    showConfirm(
      "Подтверждение заказа",
      `Вы действительно хотите принять в работу заказ "${setRecord.name || `Договор №${setRecord.contractNumber}`}" от партнера "${setRecord.originalSalonName}"?`,
      async () => {
        try {
          const batch = writeBatch(db);
          const timestamp = new Date().toISOString();

          // 1. Update status in Production's copy
          batch.update(doc(db, "companies", companyId, "partner_sets", setRecord.id), {
            status: "accepted",
            acceptedAt: timestamp,
          });

          const subProjs = projects.filter(p => p.setId === setRecord.id || setRecord.projectIds?.includes(p.id));
          for (const sp of subProjs) {
            batch.update(doc(db, "companies", companyId, "partner_projects", sp.id), {
              status: "accepted",
              acceptedAt: timestamp,
            });
          }

          // 2. Update status in Salon's copy
          if (setRecord.originalSalonId) {
            batch.update(doc(db, "companies", setRecord.originalSalonId, "sets", setRecord.id), {
              status: "accepted",
              acceptedAt: timestamp,
            });
            for (const sp of subProjs) {
              batch.update(doc(db, "companies", setRecord.originalSalonId, "projects", sp.id), {
                status: "accepted",
                acceptedAt: timestamp,
              });
            }
          }

          await batch.commit();
          showAlert("Успех", "Заказ успешно принят в работу");
        } catch (err) {
          console.error("Error accepting order:", err);
          showAlert("Ошибка", "Не удалось принять заказ");
        }
      }
    );
  };

  // Confirm accept order with revisions
  const handleAcceptOrderWithRevisions = async (setRecord: any, comment: string) => {
    setSelectedSetForAnalysis(null);
    try {
      const batch = writeBatch(db);
      const timestamp = new Date().toISOString();

      // 1. Update status and comment in Production's copy
      batch.update(doc(db, "companies", companyId, "partner_sets", setRecord.id), {
        status: "accepted_with_revisions",
        acceptedAt: timestamp,
        productionRevisionsComment: comment,
      });

      const subProjs = projects.filter(p => p.setId === setRecord.id || setRecord.projectIds?.includes(p.id));
      for (const sp of subProjs) {
        batch.update(doc(db, "companies", companyId, "partner_projects", sp.id), {
          status: "accepted_with_revisions",
          acceptedAt: timestamp,
          productionRevisionsComment: comment,
        });
      }

      // 2. Update status and comment in Salon's copy
      if (setRecord.originalSalonId) {
        batch.update(doc(db, "companies", setRecord.originalSalonId, "sets", setRecord.id), {
          status: "accepted_with_revisions",
          acceptedAt: timestamp,
          productionRevisionsComment: comment,
        });
        for (const sp of subProjs) {
          batch.update(doc(db, "companies", setRecord.originalSalonId, "projects", sp.id), {
            status: "accepted_with_revisions",
            acceptedAt: timestamp,
            productionRevisionsComment: comment,
          });
        }
      }

      await batch.commit();
      showAlert("Успех", "Заказ принят с внесенными правками");
    } catch (err) {
      console.error("Error accepting order with revisions:", err);
      showAlert("Ошибка", "Не удалось принять заказ с правками");
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mb-4" />
        <p className="text-sm font-semibold text-slate-500">Загрузка переданных заказов...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Intro section */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Заказы от салонов-партнеров</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Здесь отображаются спецификации и заказы, переданные салонами и дизайнерами на ваше производство
          </p>
        </div>
        <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200/50">
          <button
            onClick={() => setActiveFilter("all")}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-black tracking-wide uppercase transition-all",
              activeFilter === "all" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
            )}
          >
            Все ({sets.length})
          </button>
          <button
            onClick={() => setActiveFilter("pending")}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-black tracking-wide uppercase transition-all",
              activeFilter === "pending" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
            )}
          >
            Новые ({sets.filter(s => s.status === "pending" || !s.status).length})
          </button>
          <button
            onClick={() => setActiveFilter("accepted")}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-black tracking-wide uppercase transition-all",
              activeFilter === "accepted" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
            )}
          >
            Принятые ({sets.filter(s => s.status === "accepted" || s.status === "accepted_with_revisions").length})
          </button>
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {filteredSets.length === 0 ? (
          <div className="py-20 border-2 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center bg-white text-slate-400">
            <Building2 className="w-12 h-12 text-slate-300 mb-3" />
            <p className="text-base font-black text-slate-700">Нет заказов в этой вкладке</p>
            <p className="text-xs text-slate-400 font-bold uppercase mt-1 tracking-wider">Ожидайте поступлений от ваших партнеров</p>
          </div>
        ) : (
          filteredSets.map((setRecord) => {
            const subProjs = projects.filter(p => p.setId === setRecord.id || setRecord.projectIds?.includes(p.id));
            const totalProductionPrice = calculateSetProductionCost(setRecord);
            const isExpanded = expandedSetIds.has(setRecord.id);

            return (
              <div
                key={setRecord.id}
                className={cn(
                  "bg-white rounded-[2rem] border transition-all hover:shadow-xs overflow-hidden",
                  setRecord.status === "accepted" || setRecord.status === "accepted_with_revisions"
                    ? "border-slate-100"
                    : "border-indigo-100 bg-indigo-50/5"
                )}
              >
                
                {/* Header card body */}
                <div className="p-6 md:p-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                  
                  {/* Left info column */}
                  <div className="space-y-3 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 border border-indigo-100">
                        <Building2 className="w-3.5 h-3.5" /> {setRecord.originalSalonName || "Салон-партнер"}
                      </span>
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5" /> Комплект ({subProjs.length})
                      </span>
                      {setRecord.status === "accepted" && (
                        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl text-[10px] font-black uppercase tracking-wider">
                          ✓ Принят в работу
                        </span>
                      )}
                      {setRecord.status === "accepted_with_revisions" && (
                        <span className="px-2.5 py-1 bg-amber-50 text-amber-600 border border-amber-100 rounded-xl text-[10px] font-black uppercase tracking-wider">
                          ⚠ Принят с правками
                        </span>
                      )}
                      {(setRecord.status === "pending" || !setRecord.status) && (
                        <span className="px-2.5 py-1 bg-blue-50 text-blue-600 border border-blue-100 rounded-xl text-[10px] font-black uppercase tracking-wider animate-pulse">
                          ● Новый заказ
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg md:text-xl font-black text-slate-900 leading-tight">
                      {setRecord.name || `Договор №${setRecord.contractNumber || setRecord.id.slice(0, 6)}`}
                    </h3>

                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-400 font-bold">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-slate-300" />
                        <span>Дата договора: {setRecord.contractDate ? new Date(setRecord.contractDate).toLocaleDateString("ru-RU") : "Не указана"}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-slate-300" />
                        <span>Срок готовности: {setRecord.leadTimeDays || "—"} дн. ({setRecord.readyDate ? new Date(setRecord.readyDate).toLocaleDateString("ru-RU") : "не указана"})</span>
                      </div>
                    </div>
                  </div>

                  {/* Right side metrics and action button column */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 w-full lg:w-auto flex-shrink-0">
                    
                    <div className="text-left sm:text-right min-w-[140px]">
                      <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest block">Стоимость заказа</span>
                      <span className="text-xl font-black text-indigo-600">
                        {totalProductionPrice.toLocaleString()} ₽
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5 w-full sm:w-auto">
                      <button
                        onClick={() => setSelectedSetForAnalysis({ ...setRecord, subProjects: subProjs })}
                        className="flex-1 sm:flex-none px-5 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-indigo-100 transition-all flex items-center justify-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        Анализ и решение
                      </button>
                      
                      <button
                        onClick={() => toggleSetExpand(setRecord.id)}
                        className="p-3 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-800 transition-colors flex-shrink-0"
                      >
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </button>
                    </div>

                  </div>

                </div>

                {/* Expanded Project Details (Inline mapping of projects inside the set) */}
                {isExpanded && (
                  <div className="bg-slate-50/50 px-6 pb-6 pt-2 border-t border-slate-50 space-y-3">
                    <div className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mb-1.5 block">Состав комплекта ({subProjs.length} проекта):</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {subProjs.map((p) => {
                        const projRows = p.data?.summaryRows || p.specification?.summaryRows || [];
                        return (
                          <div key={p.id} className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center justify-between">
                            <div className="space-y-1">
                              <h4 className="font-extrabold text-sm text-slate-800">{p.name}</h4>
                              <p className="text-[11px] text-slate-500 font-medium">Товаров: {projRows.length} шт.</p>
                            </div>
                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-indigo-50 text-indigo-700 uppercase tracking-wide">
                              Спецификация
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    {setRecord.productionRevisionsComment && (
                      <div className="mt-4 p-4 bg-amber-50 rounded-2xl border border-amber-100 text-sm">
                        <span className="font-bold text-amber-800 uppercase text-[10px] tracking-wider block mb-1">Ваш комментарий к правкам:</span>
                        <p className="text-amber-900 font-semibold">{setRecord.productionRevisionsComment}</p>
                      </div>
                    )}
                  </div>
                )}

              </div>
            );
          })
        )}
      </div>

      {/* Selected Set Deal Analysis Modal */}
      {selectedSetForAnalysis && (
        <DealAnalysisModal
          project={selectedSetForAnalysis}
          companyType="Мебельное производство"
          isProductionView={true}
          manufacturerId={companyId}
          onClose={() => setSelectedSetForAnalysis(null)}
          onAccept={() => handleAcceptOrder(selectedSetForAnalysis)}
          onAcceptWithRevisions={(comment) => handleAcceptOrderWithRevisions(selectedSetForAnalysis, comment)}
        />
      )}

    </div>
  );
};

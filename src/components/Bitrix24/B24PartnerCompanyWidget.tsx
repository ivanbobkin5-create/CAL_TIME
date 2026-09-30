import React, { useState, useEffect } from "react";
import {
  Building2,
  User,
  DollarSign,
  TrendingUp,
  Percent,
  Package,
  MessageSquare,
  PlusCircle,
  Loader2,
  ExternalLink,
  Award
} from "lucide-react";
import { Bitrix24Context } from "../../services/bitrix24";
import { B2BOrderChatModal } from "./B2BOrderChatModal";

interface B24PartnerCompanyWidgetProps {
  b24Context: Bitrix24Context;
  companyData: any;
}

export const B24PartnerCompanyWidget: React.FC<B24PartnerCompanyWidgetProps> = ({
  b24Context,
  companyData
}) => {
  const entityId = b24Context.placementOptions?.ID || b24Context.placementOptions?.entityId;
  const isCompany = b24Context.placement?.includes("COMPANY");
  
  const [loading, setLoading] = useState(true);
  const [partnerStats, setPartnerStats] = useState<any>({
    totalOrdersCount: 0,
    totalTurnover: 0,
    activeOrdersCount: 0,
    partnerDiscount: 10,
    partnerName: isCompany ? `Компания #${entityId}` : `Клиент #${entityId}`
  });
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    const loadPartnerData = async () => {
      setLoading(true);
      try {
        const compId = companyData?.id || "default";
        const res = await fetch(`/api/db/col/companies/${compId}/projects`);
        if (res.ok) {
          const projects = await res.json();
          if (Array.isArray(projects)) {
            const allItems = projects.map(p => ({ id: p.id, ...p.data }));
            const totalCount = allItems.length;
            const turnover = allItems.reduce((sum, item) => sum + (item.totalPrice || item.clientPrice || 0), 0);
            const activeCount = allItems.filter(item => item.status === "in_progress" || item.status === "in_production").length;

            setPartnerStats((prev: any) => ({
              ...prev,
              totalOrdersCount: totalCount,
              totalTurnover: turnover,
              activeOrdersCount: activeCount
            }));
          }
        }
      } catch (e) {
        console.warn("Could not load partner stats in B24 widget:", e);
      } finally {
        setLoading(false);
      }
    };

    loadPartnerData();
  }, [entityId, companyData?.id]);

  const handleOpenCalculator = () => {
    if (typeof window !== "undefined" && window.BX24?.openSlider) {
      const currentUrl = window.location.href.split("?")[0];
      window.BX24.openSlider(`${currentUrl}?PLACEMENT=LEFT_MENU`, { width: 1400 });
    } else {
      window.open(window.location.href, "_blank");
    }
  };

  return (
    <div className="bg-slate-900 text-slate-100 min-h-screen p-3.5 font-sans space-y-3.5 border-l border-slate-800">
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0">
            {isCompany ? <Building2 className="w-4 h-4" /> : <User className="w-4 h-4" />}
          </div>
          <div>
            <h4 className="font-extrabold text-xs text-white leading-tight">
              {isCompany ? "Виджет Компании" : "Виджет Партнера"}
            </h4>
            <p className="text-[10px] text-indigo-300 font-semibold truncate max-w-[150px]">
              ID: {entityId || "Не указан"}
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenCalculator}
          className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>Новый заказ</span>
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-8 space-y-2">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
          <p className="text-[11px] text-slate-400 font-medium">Анализ показателей партнера...</p>
        </div>
      ) : (
        <>
          {/* Main KPI Grid */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-slate-800/80 rounded-2xl p-3 border border-slate-700/80 space-y-1">
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-emerald-400" />
                Оборот:
              </span>
              <div className="text-xs font-black text-emerald-400 truncate">
                {partnerStats.totalTurnover.toLocaleString("ru-RU")} ₽
              </div>
            </div>

            <div className="bg-slate-800/80 rounded-2xl p-3 border border-slate-700/80 space-y-1">
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                <Percent className="w-3 h-3 text-indigo-400" />
                Скидка:
              </span>
              <div className="text-xs font-black text-indigo-200">
                {partnerStats.partnerDiscount}%
              </div>
            </div>
          </div>

          {/* Active Orders Summary */}
          <div className="bg-slate-800/80 rounded-2xl p-3 border border-slate-700/80 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-300 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-cyan-400" />
                В производстве:
              </span>
              <span className="text-cyan-300 font-black">
                {partnerStats.activeOrdersCount} заказов
              </span>
            </div>

            <div className="flex items-center justify-between text-xs font-bold pt-1.5 border-t border-slate-700/60">
              <span className="text-slate-300 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-amber-400" />
                Всего заказов:
              </span>
              <span className="text-amber-200 font-black">
                {partnerStats.totalOrdersCount} шт
              </span>
            </div>
          </div>

          {/* B2B Chat Action */}
          <button
            onClick={() => setShowChat(true)}
            className="w-full p-3 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Открыть B2B Чат с партнером</span>
          </button>
        </>
      )}

      {/* Chat Modal */}
      {showChat && (
        <B2BOrderChatModal
          orderId={String(entityId || "partner")}
          orderName={`Партнер #${entityId}`}
          currentCompanyId={companyData?.id || "default"}
          currentCompanyName={companyData?.name || "Наша компания"}
          currentCompanyType={companyData?.type || "Салон"}
          onClose={() => setShowChat(false)}
        />
      )}
    </div>
  );
};

import React, { useState, useEffect } from "react";
import {
  Layers,
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
import { Bitrix24Context, resizeBitrix24WindowToContent } from "../../services/bitrix24";
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
    resizeBitrix24WindowToContent();
    const t = setTimeout(resizeBitrix24WindowToContent, 300);
    return () => clearTimeout(t);
  }, [loading, partnerStats]);

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
    <div className="bg-[#f5f7f8] text-[#333333] min-h-screen p-3.5 font-sans space-y-3.5 border-l border-[#dfe5ec]">
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-[#eef2f4]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs border border-blue-500/30">
            <Layers className="w-4 h-4 text-white" />
          </div>
          <div>
            <h4 className="font-extrabold text-xs text-[#1058d0] leading-tight flex items-center gap-1.5">
              Мебель План
              <span className="text-[9px] bg-[#eef2f4] text-[#1058d0] font-bold px-1.5 py-0.2 rounded border border-[#b2d1ef]">
                {isCompany ? "Компания" : "Клиент"}
              </span>
            </h4>
            <p className="text-[10px] text-[#535c69] font-semibold truncate max-w-[150px]">
              ID: {entityId || "Не указан"}
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenCalculator}
          className="p-1.5 rounded-lg bg-[#1058d0] hover:bg-[#0c47a8] text-white text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>Новый расчет</span>
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-8 space-y-2">
          <Loader2 className="w-6 h-6 animate-spin text-[#1058d0]" />
          <p className="text-[11px] text-[#535c69] font-medium">Анализ показателей...</p>
        </div>
      ) : (
        <>
          {/* Main KPI Grid */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white rounded-xl p-3 border border-[#dfe5ec] space-y-1 shadow-2xs">
              <span className="text-[9px] font-black uppercase text-[#535c69] tracking-wider flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-emerald-600" />
                Оборот:
              </span>
              <div className="text-xs font-black text-[#1058d0] truncate">
                {partnerStats.totalTurnover.toLocaleString("ru-RU")} ₽
              </div>
            </div>

            <div className="bg-white rounded-xl p-3 border border-[#dfe5ec] space-y-1 shadow-2xs">
              <span className="text-[9px] font-black uppercase text-[#535c69] tracking-wider flex items-center gap-1">
                <Percent className="w-3 h-3 text-[#1058d0]" />
                Скидка:
              </span>
              <div className="text-xs font-black text-[#333333]">
                {partnerStats.partnerDiscount}%
              </div>
            </div>
          </div>

          {/* Active Orders Summary */}
          <div className="bg-white rounded-xl p-3 border border-[#dfe5ec] space-y-2 shadow-2xs">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-[#535c69] flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-[#1058d0]" />
                В производстве:
              </span>
              <span className="text-[#1058d0] font-black">
                {partnerStats.activeOrdersCount} заказов
              </span>
            </div>

            <div className="flex items-center justify-between text-xs font-bold pt-1.5 border-t border-[#f5f7f8]">
              <span className="text-[#535c69] flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-amber-500" />
                Всего заказов:
              </span>
              <span className="text-[#333333] font-black">
                {partnerStats.totalOrdersCount} шт
              </span>
            </div>
          </div>

          {/* B2B Chat Action */}
          <button
            onClick={() => setShowChat(true)}
            className="w-full p-2.5 rounded-xl bg-white hover:bg-emerald-50/60 border border-emerald-200 text-emerald-800 font-extrabold text-xs flex items-center justify-center gap-2 shadow-2xs transition-all cursor-pointer"
          >
            <MessageSquare className="w-4 h-4 text-emerald-600" />
            <span>Открыть B2B Чат</span>
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

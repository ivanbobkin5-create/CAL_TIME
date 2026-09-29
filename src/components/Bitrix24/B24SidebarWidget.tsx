import React, { useState, useEffect } from "react";
import {
  Calculator,
  MessageSquare,
  Camera,
  FileText,
  Building2,
  ExternalLink,
  CheckCircle2,
  Clock,
  Send,
  Loader2,
  DollarSign
} from "lucide-react";
import { Bitrix24Context } from "../../services/bitrix24";
import { B2BOrderChatModal } from "./B2BOrderChatModal";
import { BitrixPhotoReportModal } from "./BitrixPhotoReportModal";

interface B24SidebarWidgetProps {
  b24Context: Bitrix24Context;
  companyData: any;
}

export const B24SidebarWidget: React.FC<B24SidebarWidgetProps> = ({
  b24Context,
  companyData
}) => {
  const dealId = b24Context.dealId;
  const [dealData, setDealData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [showPhotoReport, setShowPhotoReport] = useState(false);

  useEffect(() => {
    if (!dealId) {
      setLoading(false);
      return;
    }

    // Load deal calculation summary
    const loadDealInfo = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/db/doc/companies/${companyData?.id || 'default'}/projects/b24_deal_${dealId}`);
        if (res.ok) {
          const json = await res.json();
          if (json.data) {
            setDealData(JSON.parse(json.data));
          }
        }
      } catch (e) {
        console.warn("Could not load deal project in widget:", e);
      } finally {
        setLoading(false);
      }
    };

    loadDealInfo();
  }, [dealId, companyData?.id]);

  const handleOpenFullCalculator = () => {
    if (typeof window !== "undefined" && window.BX24?.openSlider) {
      const currentUrl = window.location.href.split("?")[0];
      const sliderUrl = `${currentUrl}?PLACEMENT=CRM_DEAL_DETAIL_TAB&PLACEMENT_OPTIONS=${encodeURIComponent(
        JSON.stringify({ ID: dealId })
      )}`;
      window.BX24.openSlider(sliderUrl, { width: 1400 });
    } else {
      window.open(window.location.href, "_blank");
    }
  };

  const calculateTotalPrice = () => {
    if (!dealData) return null;
    if (dealData.clientPrice || dealData.totalClientPrice) {
      return (dealData.clientPrice || dealData.totalClientPrice).toLocaleString("ru-RU") + " ₽";
    }
    if (dealData.summary?.clientTotal) {
      return dealData.summary.clientTotal.toLocaleString("ru-RU") + " ₽";
    }
    return null;
  };

  return (
    <div className="bg-slate-900 text-slate-100 min-h-screen p-3.5 font-sans space-y-3.5 border-l border-slate-800">
      {/* Header Badge */}
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0">
            <Calculator className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-extrabold text-xs text-white leading-tight">
              Мебельный Калькулятор
            </h4>
            <p className="text-[10px] text-indigo-300 font-semibold">
              {dealId ? `Сделка #${dealId}` : "Умный виджет CRM"}
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenFullCalculator}
          title="Развернуть во весь экран"
          className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Открыть</span>
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-8 space-y-2">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
          <p className="text-[11px] text-slate-400 font-medium">Загрузка данных сделки...</p>
        </div>
      ) : (
        <>
          {/* Main Summary Card */}
          <div className="bg-slate-800/80 rounded-2xl p-3 border border-slate-700/80 space-y-2.5 shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Сумма расчета:
              </span>
              <span className="text-sm font-black text-emerald-400">
                {calculateTotalPrice() || "Расчет не сохранен"}
              </span>
            </div>

            {dealData?.projectName && (
              <div className="text-xs font-bold text-slate-200 line-clamp-1">
                Проект: <span className="text-white">{dealData.projectName}</span>
              </div>
            )}

            {/* B2B Status Tag */}
            <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between text-[11px]">
              <span className="text-slate-400 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                Фабрика:
              </span>
              <span className="font-bold text-indigo-200 truncate max-w-[140px]">
                {dealData?.partnerCompanyName || "Не выбрана"}
              </span>
            </div>
          </div>

          {/* Quick Action Grid */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleOpenFullCalculator}
              className="p-3 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-left transition-all cursor-pointer shadow-sm group space-y-1.5"
            >
              <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center text-white">
                <Calculator className="w-4 h-4" />
              </div>
              <div className="font-extrabold text-[11px] leading-snug">Калькулятор 3D</div>
              <div className="text-[9px] text-indigo-200">Расчитать проект</div>
            </button>

            <button
              onClick={() => setShowChat(true)}
              className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-left transition-all cursor-pointer shadow-sm space-y-1.5 relative"
            >
              <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div className="font-extrabold text-[11px] leading-snug">B2B Чат</div>
              <div className="text-[9px] text-slate-400">Связь с фабрикой</div>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-2">
            <button
              onClick={() => setShowPhotoReport(true)}
              className="w-full p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 hover:text-white flex items-center justify-between transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-cyan-400" />
                <span>Фотоотчеты монтажа</span>
              </div>
              <span className="text-[10px] text-slate-400">Просмотр ➔</span>
            </button>
          </div>
        </>
      )}

      {/* Chat Modal */}
      {showChat && (
        <B2BOrderChatModal
          orderId={String(dealId || "default")}
          orderName={dealData?.projectName || `Сделка #${dealId}`}
          currentCompanyId={companyData?.id || "default"}
          currentCompanyName={companyData?.name || "Наша компания"}
          partnerCompanyId={dealData?.partnerCompanyId || "partner_default"}
          partnerCompanyName={dealData?.partnerCompanyName || "Мебельная Фабрика"}
          currentCompanyType={companyData?.type || "Салон"}
          onClose={() => setShowChat(false)}
        />
      )}

      {/* Photo Report Modal */}
      {showPhotoReport && dealId && (
        <BitrixPhotoReportModal
          dealId={dealId}
          companyId={companyData?.id || "default"}
          onClose={() => setShowPhotoReport(false)}
        />
      )}
    </div>
  );
};

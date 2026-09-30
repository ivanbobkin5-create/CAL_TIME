import React, { useState, useEffect } from "react";
import {
  Layers,
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
  DollarSign,
  X,
  AlertOctagon,
  Bell,
  Sparkles
} from "lucide-react";
import { Bitrix24Context, resizeBitrix24WindowToContent } from "../../services/bitrix24";
import { AppIcon } from "../Common/AppIcon";
import { B2BOrderChatModal } from "./B2BOrderChatModal";
import { BitrixPhotoReportModal } from "./BitrixPhotoReportModal";
import { BitrixReclamationModal } from "./BitrixReclamationModal";
import { BitrixNotificationModal } from "./BitrixNotificationModal";

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
  const [showReclamation, setShowReclamation] = useState(false);
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    resizeBitrix24WindowToContent();
    const t = setTimeout(resizeBitrix24WindowToContent, 300);
    return () => clearTimeout(t);
  }, [loading, dealData]);

  useEffect(() => {
    if (!dealId) {
      setLoading(false);
      return;
    }

    const loadDealInfo = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/db/doc/companies/${companyData?.id || 'default'}/projects/b24_deal_${dealId}`);
        if (res.ok) {
          const json = await res.json();
          if (json.data) {
            setDealData(JSON.parse(json.data));
          } else if (json.totalPrice || json.name) {
            setDealData(json);
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

  const handleClose = () => {
    try {
      if (typeof window !== "undefined") {
        if ((window as any).BX24?.slider?.close) {
          (window as any).BX24.slider.close();
          return;
        }
        if ((window as any).BX24?.closeApplication) {
          (window as any).BX24.closeApplication();
          return;
        }
        if ((window.parent as any)?.BX?.SidePanel?.Instance?.close) {
          (window.parent as any).BX.SidePanel.Instance.close();
          return;
        }
      }
    } catch (_) {}
  };

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
    if (dealData.totalPrice || dealData.data?.totalSum) {
      const p = dealData.totalPrice || dealData.data?.totalSum;
      return Number(p).toLocaleString("ru-RU") + " ₽";
    }
    if (dealData.clientPrice || dealData.totalClientPrice) {
      return (dealData.clientPrice || dealData.totalClientPrice).toLocaleString("ru-RU") + " ₽";
    }
    if (dealData.summary?.clientTotal) {
      return dealData.summary.clientTotal.toLocaleString("ru-RU") + " ₽";
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-[#f5f7f8] text-[#333333] flex flex-col items-center justify-start p-3 sm:p-5 font-sans">
      {/* Centered compact widget container matching Bitrix24 CRM UI */}
      <div className="w-full max-w-md bg-white border border-[#dfe5ec] rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
        
        {/* Header Badge & Close Button */}
        <div className="flex items-center justify-between pb-3 border-b border-[#eef2f4]">
          <div className="flex items-center gap-2.5">
            <AppIcon className="w-9 h-9 rounded-xl shrink-0 shadow-xs" />
            <div>
              <h4 className="font-extrabold text-sm text-[#1058d0] leading-tight flex items-center gap-1.5">
                Мебель План
                <span className="text-[10px] bg-[#eef2f4] text-[#1058d0] font-bold px-1.5 py-0.5 rounded border border-[#b2d1ef]">
                  CRM
                </span>
              </h4>
              <p className="text-[11px] text-[#535c69] font-bold">
                {dealId ? `Сделка #${dealId}` : "Интерактивная панель"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleClose}
              title="Закрыть виджет"
              className="w-8 h-8 rounded-xl bg-[#f5f7f8] hover:bg-[#eef2f4] text-[#535c69] hover:text-[#333333] flex items-center justify-center transition-all cursor-pointer border border-[#d5dbe0]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#1058d0]" />
            <p className="text-[11px] text-[#535c69] font-medium">Загрузка данных сделки...</p>
          </div>
        ) : (
          <>
            {/* Calculation Summary Card */}
            <div className="bg-[#f8fafc] rounded-xl p-3.5 border border-[#e2e8f0] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#535c69]">
                  Сумма спецификации:
                </span>
                <span className="text-lg font-black text-[#1058d0]">
                  {calculateTotalPrice() || "0 ₽"}
                </span>
              </div>

              {dealData?.name && (
                <div className="text-xs font-bold text-[#333333] line-clamp-1 pt-1 border-t border-[#e2e8f0]">
                  Проект: <span className="text-[#1058d0]">{dealData.name}</span>
                </div>
              )}

              {/* Status & hint */}
              <div className="pt-1 flex items-center justify-between text-[11px] text-[#535c69]">
                <span className="flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-[#1058d0]" />
                  Производство:
                </span>
                <span className="font-bold text-[#333333] truncate max-w-[170px]">
                  {companyData?.name || "Мебель Фактура"}
                </span>
              </div>
            </div>

            {/* Quick Action Grid */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleOpenFullCalculator}
                className="p-3 rounded-xl bg-[#1058d0] hover:bg-[#0d4eb9] text-white text-left transition-all cursor-pointer shadow-xs group space-y-1"
              >
                <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center text-white">
                  <Calculator className="w-4 h-4" />
                </div>
                <div className="font-extrabold text-[12px] leading-snug">Калькулятор</div>
                <div className="text-[10px] text-blue-100">Открыть расчет</div>
              </button>

              <button
                onClick={() => setShowChat(true)}
                className="p-3 rounded-xl bg-white hover:bg-emerald-50/60 text-[#333333] border border-emerald-200 text-left transition-all cursor-pointer shadow-2xs space-y-1 relative"
              >
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div className="font-extrabold text-[12px] text-emerald-800 leading-snug">B2B-Чат</div>
                <div className="text-[10px] text-[#535c69]">Диалог по заказу</div>
              </button>
            </div>

            {/* Timeline Action Buttons */}
            <div className="space-y-1.5 pt-1">
              <button
                onClick={() => setShowPhotoReport(true)}
                className="w-full p-2.5 rounded-xl bg-white hover:bg-[#eef2f4] border border-[#d5dbe0] text-xs font-bold text-[#333333] flex items-center justify-between transition-all cursor-pointer shadow-2xs"
              >
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-[#1058d0]" />
                  <span>Фотоотчет монтажа</span>
                </div>
                <span className="text-[11px] font-semibold text-[#1058d0]">В таймлайн ➔</span>
              </button>

              <button
                onClick={() => setShowReclamation(true)}
                className="w-full p-2.5 rounded-xl bg-white hover:bg-rose-50/60 border border-rose-200 text-xs font-bold text-rose-700 flex items-center justify-between transition-all cursor-pointer shadow-2xs"
              >
                <div className="flex items-center gap-2">
                  <AlertOctagon className="w-4 h-4 text-rose-500" />
                  <span>Оформить рекламацию</span>
                </div>
                <span className="text-[11px] font-semibold text-rose-600">Задача ➔</span>
              </button>

              <button
                onClick={() => setShowNotification(true)}
                className="w-full p-2.5 rounded-xl bg-white hover:bg-indigo-50/60 border border-indigo-200 text-xs font-bold text-indigo-700 flex items-center justify-between transition-all cursor-pointer shadow-2xs"
              >
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-indigo-500" />
                  <span>Оповестить менеджера</span>
                </div>
                <span className="text-[11px] font-semibold text-indigo-600">Колокольчик ➔</span>
              </button>
            </div>

            {/* Embedded Tab Hint */}
            <div className="p-3 bg-[#eef2f4] border border-[#d5dbe0] rounded-xl text-[11px] text-[#535c69] leading-relaxed">
              💡 <b>Совет:</b> В карточке сделки сверху во вкладке <b>«Мебель План»</b> приложение встроено напрямую внутри карточки, без всплывающего окна.
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      {showChat && (
        <B2BOrderChatModal
          orderId={String(dealId || "default")}
          orderName={dealData?.name || `Сделка #${dealId}`}
          currentCompanyId={companyData?.id || "default"}
          currentCompanyName={companyData?.name || "Наша компания"}
          partnerCompanyId={dealData?.partnerCompanyId || "partner_default"}
          partnerCompanyName={dealData?.partnerCompanyName || "Мебельная Фабрика"}
          currentCompanyType={companyData?.type || "Салон"}
          onClose={() => setShowChat(false)}
        />
      )}

      {showPhotoReport && dealId && (
        <BitrixPhotoReportModal
          dealId={dealId}
          companyId={companyData?.id || "default"}
          onClose={() => setShowPhotoReport(false)}
        />
      )}

      {showReclamation && dealId && (
        <BitrixReclamationModal
          dealId={dealId}
          companyId={companyData?.id || "default"}
          onClose={() => setShowReclamation(false)}
        />
      )}

      {showNotification && dealId && (
        <BitrixNotificationModal
          dealId={dealId}
          companyId={companyData?.id || "default"}
          onClose={() => setShowNotification(false)}
        />
      )}
    </div>
  );
};

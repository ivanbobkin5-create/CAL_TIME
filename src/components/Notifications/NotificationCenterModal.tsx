import React, { useState, useEffect } from "react";
import {
  Bell,
  X,
  CheckCheck,
  Info,
  AlertTriangle,
  Sparkles,
  Tag,
  Building2,
  Calendar,
  Eye,
  ChevronRight
} from "lucide-react";
import { cn } from "../../lib/utils";

export interface SystemNewsItem {
  id: string;
  title: string;
  content: string;
  type: "info" | "warning" | "update" | "promo";
  targetAudience: "all" | "production" | "salon" | "designer" | "private";
  targetCompanyId?: string;
  targetCompanyName?: string;
  targetUserEmail?: string;
  isBanner?: boolean;
  createdAt: string;
  updatedAt?: string;
  authorName?: string;
  isActive: boolean;
}

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  newsList: SystemNewsItem[];
  readNewsIds: string[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  companyData?: any;
  userData?: any;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
  newsList,
  readNewsIds,
  onMarkAsRead,
  onMarkAllAsRead,
  companyData,
  userData
}) => {
  const [filter, setFilter] = useState<"all" | "unread" | "important">("all");
  const [selectedNews, setSelectedNews] = useState<SystemNewsItem | null>(null);

  // Filter news relevant to current user and company
  const relevantNews = newsList.filter((item) => {
    if (!item.isActive) return false;
    
    // Check audience targeting
    if (item.targetAudience === "all") return true;

    const compType = (companyData?.type || "").toLowerCase();
    const isProduction = compType.includes("производ") || companyData?.productionFormat === "own";
    const isSalon = compType.includes("салон");
    const isDesigner = compType.includes("дизайн");

    if (item.targetAudience === "production") return isProduction;
    if (item.targetAudience === "salon") return isSalon;
    if (item.targetAudience === "designer") return isDesigner;

    if (item.targetAudience === "private") {
      if (item.targetCompanyId && (item.targetCompanyId === companyData?.id || item.targetCompanyId === companyData?.alias)) {
        return true;
      }
      if (item.targetUserEmail && userData?.email && item.targetUserEmail.toLowerCase() === userData.email.toLowerCase()) {
        return true;
      }
      return false;
    }

    return true;
  });

  const displayNews = relevantNews.filter((item) => {
    const isRead = readNewsIds.includes(item.id);
    if (filter === "unread") return !isRead;
    if (filter === "important") return item.type === "warning" || item.isBanner;
    return true;
  });

  const unreadCount = relevantNews.filter(n => !readNewsIds.includes(n.id)).length;

  if (!isOpen) return null;

  const getTypeBadge = (type: SystemNewsItem["type"]) => {
    switch (type) {
      case "warning":
        return {
          label: "Важное",
          icon: <AlertTriangle className="w-3.5 h-3.5" />,
          classes: "bg-amber-50 text-amber-700 border-amber-200"
        };
      case "update":
        return {
          label: "Обновление",
          icon: <Sparkles className="w-3.5 h-3.5" />,
          classes: "bg-blue-50 text-blue-700 border-blue-200"
        };
      case "promo":
        return {
          label: "Акция",
          icon: <Tag className="w-3.5 h-3.5" />,
          classes: "bg-emerald-50 text-emerald-700 border-emerald-200"
        };
      default:
        return {
          label: "Информация",
          icon: <Info className="w-3.5 h-3.5" />,
          classes: "bg-slate-100 text-slate-700 border-slate-200"
        };
    }
  };

  const formatDate = (iso: string) => {
    if (!iso) return "";
    try {
      const d = new Date(iso);
      return d.toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-gray-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="fixed inset-0"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-gray-100 flex flex-col max-h-[90vh] overflow-hidden z-10 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-50/50 via-white to-indigo-50/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/20">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-gray-900">Новости и объявления</h2>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-black bg-red-500 text-white animate-pulse">
                    +{unreadCount}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500">Официальные уведомления и обновления Мебель План</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllAsRead}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer border border-blue-100"
                title="Отметить все новости как прочитанные"
              >
                <CheckCheck className="w-4 h-4" />
                <span>Прочитать все</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/60 flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setFilter("all")}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                filter === "all"
                  ? "bg-white text-blue-700 shadow-xs border border-blue-100 font-extrabold"
                  : "text-gray-600 hover:text-gray-900 hover:bg-white/60"
              )}
            >
              Все ({relevantNews.length})
            </button>
            <button
              onClick={() => setFilter("unread")}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
                filter === "unread"
                  ? "bg-white text-blue-700 shadow-xs border border-blue-100 font-extrabold"
                  : "text-gray-600 hover:text-gray-900 hover:bg-white/60"
              )}
            >
              <span>Непрочитанные</span>
              {unreadCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-black">
                  {unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setFilter("important")}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                filter === "important"
                  ? "bg-white text-amber-700 shadow-xs border border-amber-200 font-extrabold"
                  : "text-gray-600 hover:text-gray-900 hover:bg-white/60"
              )}
            >
              Важные
            </button>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={onMarkAllAsRead}
              className="sm:hidden text-xs font-bold text-blue-600 hover:underline shrink-0 cursor-pointer"
            >
              Прочитать все
            </button>
          )}
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 divide-y divide-gray-100">
          {displayNews.length === 0 ? (
            <div className="py-12 text-center text-gray-400 space-y-3">
              <div className="w-14 h-14 mx-auto rounded-3xl bg-gray-50 flex items-center justify-center border border-gray-100 text-gray-300">
                <Bell className="w-7 h-7" />
              </div>
              <p className="text-sm font-bold text-gray-600">Нет новостей в этом разделе</p>
              <p className="text-xs text-gray-400">Когда администрация опубликует обновление, оно появится здесь</p>
            </div>
          ) : (
            displayNews.map((item) => {
              const isRead = readNewsIds.includes(item.id);
              const badge = getTypeBadge(item.type);
              const isExpanded = selectedNews?.id === item.id;

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    if (!isRead) onMarkAsRead(item.id);
                    setSelectedNews(prev => prev?.id === item.id ? null : item);
                  }}
                  className={cn(
                    "pt-3 first:pt-0 p-4 rounded-2xl transition-all cursor-pointer border group",
                    !isRead
                      ? "bg-blue-50/40 border-blue-200/80 shadow-xs hover:bg-blue-50/70"
                      : "bg-white border-gray-100 hover:border-gray-200 hover:bg-gray-50/50"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cn(
                          "px-2 py-0.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider border flex items-center gap-1",
                          badge.classes
                        )}>
                          {badge.icon}
                          <span>{badge.label}</span>
                        </span>

                        {item.targetAudience === "private" && (
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                            🔒 Личное
                          </span>
                        )}

                        {item.targetAudience === "production" && (
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            🏭 Для производств
                          </span>
                        )}

                        {item.targetAudience === "salon" && (
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                            🛋️ Для салонов
                          </span>
                        )}

                        {item.targetAudience === "designer" && (
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            🎨 Для дизайнеров
                          </span>
                        )}

                        {!isRead && (
                          <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                        )}

                        <span className="text-[11px] text-gray-400 flex items-center gap-1 ml-auto">
                          <Calendar className="w-3 h-3" />
                          <span>{formatDate(item.createdAt)}</span>
                        </span>
                      </div>

                      <h3 className={cn(
                        "text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors",
                        !isRead && "font-black"
                      )}>
                        {item.title}
                      </h3>

                      <div className={cn(
                        "text-xs text-gray-600 whitespace-pre-wrap leading-relaxed",
                        !isExpanded && "line-clamp-2"
                      )}>
                        {item.content}
                      </div>
                    </div>

                    <div className="shrink-0 pt-1 text-gray-400 group-hover:text-blue-600 transition-colors">
                      <ChevronRight className={cn(
                        "w-4 h-4 transition-transform",
                        isExpanded && "rotate-90"
                      )} />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-gray-400" />
            <span>{companyData?.name || "Компания"}</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-900 hover:bg-black text-white font-bold rounded-xl transition-all cursor-pointer"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};

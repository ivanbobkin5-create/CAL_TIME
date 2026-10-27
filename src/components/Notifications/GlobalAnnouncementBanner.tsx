import React, { useState } from "react";
import { AlertTriangle, Info, Sparkles, Tag, X, ArrowRight } from "lucide-react";
import { cn } from "../../lib/utils";
import { SystemNewsItem } from "./NotificationCenterModal";

interface GlobalAnnouncementBannerProps {
  bannerNews: SystemNewsItem | null;
  onOpenNewsModal: (newsItem: SystemNewsItem) => void;
}

export const GlobalAnnouncementBanner: React.FC<GlobalAnnouncementBannerProps> = ({
  bannerNews,
  onOpenNewsModal
}) => {
  const [isDismissed, setIsDismissed] = useState(false);

  if (!bannerNews || isDismissed) return null;

  const getTypeStyles = (type: SystemNewsItem["type"]) => {
    switch (type) {
      case "warning":
        return {
          container: "bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white",
          icon: <AlertTriangle className="w-4 h-4 shrink-0" />,
          btn: "bg-white/20 hover:bg-white/30 text-white"
        };
      case "update":
        return {
          container: "bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white",
          icon: <Sparkles className="w-4 h-4 shrink-0" />,
          btn: "bg-white/20 hover:bg-white/30 text-white"
        };
      case "promo":
        return {
          container: "bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white",
          icon: <Tag className="w-4 h-4 shrink-0" />,
          btn: "bg-white/20 hover:bg-white/30 text-white"
        };
      default:
        return {
          container: "bg-gradient-to-r from-slate-900 via-gray-900 to-slate-800 text-white",
          icon: <Info className="w-4 h-4 shrink-0" />,
          btn: "bg-white/20 hover:bg-white/30 text-white"
        };
    }
  };

  const style = getTypeStyles(bannerNews.type);

  return (
    <div className={cn("px-4 py-2.5 shadow-md flex items-center justify-between gap-3 text-xs z-[90] relative transition-all animate-in slide-in-from-top duration-300", style.container)}>
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <div className="p-1 rounded-lg bg-white/10 shrink-0">
          {style.icon}
        </div>
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <strong className="font-black shrink-0">{bannerNews.title}:</strong>
          <span className="font-medium truncate opacity-95">{bannerNews.content}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => onOpenNewsModal(bannerNews)}
          className={cn("px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors cursor-pointer flex items-center gap-1", style.btn)}
        >
          <span>Подробнее</span>
          <ArrowRight className="w-3 h-3" />
        </button>

        <button
          onClick={() => setIsDismissed(true)}
          className="p-1 hover:bg-white/20 rounded-lg transition-colors cursor-pointer text-white/80 hover:text-white"
          title="Скрыть объявление"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

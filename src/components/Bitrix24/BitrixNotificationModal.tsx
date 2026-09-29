import React, { useState } from "react";
import {
  X,
  Bell,
  MessageSquare,
  Send,
  Loader2,
  CheckCircle2,
  Sparkles,
  User
} from "lucide-react";
import { cn } from "../../lib/utils";
import {
  sendBitrix24BellNotification,
  getBitrix24Context,
  SendBitrix24NotificationParams
} from "../../services/bitrix24";

interface BitrixNotificationModalProps {
  dealId?: number | string | null;
  dealTitle?: string;
  companyId: string;
  onClose: () => void;
  showAlert?: (title: string, message: string) => void;
}

const NOTIFICATION_TEMPLATES = [
  {
    title: "📦 Заказ передан в производство",
    text: "Заказ запущен в производство. Спецификация утверждена, материалы зарезервированы."
  },
  {
    title: "✂️ Раскрой и кромление выполнены",
    text: "Раскрой плитных материалов и кромкооблицовка завершены. Детали переданы на присадку."
  },
  {
    title: "🎨 Фасады изготовлены",
    text: "Фасадная часть заказа изготовлена и прошла контроль качества."
  },
  {
    title: "🚚 Готов к отгрузке / доставке",
    text: "Заказ полностью укомплектован на складе готовой продукции и готов к доставке заказчику."
  },
  {
    title: "🛠️ Монтаж назначен",
    text: "Дата и время монтажа согласованы с заказчиком. Бригада сформирована."
  },
  {
    title: "📸 Фотоотчет монтажа сдан",
    text: "Монтаж завершен! Фотоотчет объекта и акт приема-передачи загружены в таймлайн сделки."
  },
  {
    title: "📐 Требуется согласование эскиза",
    text: "В проекте внесены корректировки. Требуется согласование спецификации с клиентом."
  }
];

export const BitrixNotificationModal: React.FC<BitrixNotificationModalProps> = ({
  dealId: initialDealId,
  dealTitle,
  companyId,
  onClose,
  showAlert = (title, msg) => alert(`${title}: ${msg}`)
}) => {
  const b24Context = getBitrix24Context();
  const currentDealId = initialDealId || b24Context?.dealId || "";

  const [dealIdInput, setDealIdInput] = useState<string>(String(currentDealId || ""));
  const [channel, setChannel] = useState<"system" | "chat">("system");
  const [message, setMessage] = useState<string>("");
  const [isSending, setIsSending] = useState<boolean>(false);

  const applyTemplate = (tplText: string) => {
    setMessage(tplText);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      showAlert("Внимание", "Введите текст сообщения");
      return;
    }

    setIsSending(true);
    try {
      const params: SendBitrix24NotificationParams = {
        companyId,
        dealId: dealIdInput.trim() || undefined,
        message: message.trim(),
        type: channel === "chat" ? "chat" : "system"
      };

      const result = await sendBitrix24BellNotification(params);

      if (result.success) {
        showAlert(
          "Отправлено!",
          channel === "chat"
            ? "Сообщение успешно отправлено в чат Битрикс24!"
            : "Уведомление успешно доставлено в колокольчик Битрикс24!"
        );
        onClose();
      } else {
        showAlert("Ошибка", result.message || "Не удалось отправить уведомление");
      }
    } catch (err: any) {
      showAlert("Ошибка", err.message || "Сбой отправки уведомления");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 p-5 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center border border-white/30 shadow-inner">
              <Bell className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg leading-tight">Уведомление в Битрикс24</h3>
              <p className="text-xs text-cyan-100 mt-0.5">
                Мгновенное оповещение в колокольчик (im.notify) или чат
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/25 flex items-center justify-center transition-all cursor-pointer text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSend} className="p-6 space-y-4">
          {/* Deal ID */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              ID Сделки (для определения ответственного менеджера)
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-bold text-xs">
                #
              </span>
              <input
                type="number"
                value={dealIdInput}
                onChange={(e) => setDealIdInput(e.target.value)}
                placeholder="1042"
                className="w-full pl-7 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-bold text-slate-900 bg-slate-50"
              />
            </div>
            {dealTitle && (
              <p className="text-[10px] text-slate-400 truncate mt-1">Сделка: {dealTitle}</p>
            )}
          </div>

          {/* Channel Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Канал отправки</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setChannel("system")}
                className={cn(
                  "p-3 rounded-2xl border text-left flex items-center gap-2.5 transition-all cursor-pointer",
                  channel === "system"
                    ? "border-blue-600 bg-blue-50/70 text-blue-950 ring-2 ring-blue-500/20 shadow-xs"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                )}
              >
                <Bell
                  className={cn(
                    "w-4 h-4",
                    channel === "system" ? "text-blue-600" : "text-slate-400"
                  )}
                />
                <div>
                  <div className="font-extrabold text-xs">Колокольчик</div>
                  <div className="text-[10px] text-slate-500">im.notify.system</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setChannel("chat")}
                className={cn(
                  "p-3 rounded-2xl border text-left flex items-center gap-2.5 transition-all cursor-pointer",
                  channel === "chat"
                    ? "border-indigo-600 bg-indigo-50/70 text-indigo-950 ring-2 ring-indigo-500/20 shadow-xs"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                )}
              >
                <MessageSquare
                  className={cn(
                    "w-4 h-4",
                    channel === "chat" ? "text-indigo-600" : "text-slate-400"
                  )}
                />
                <div>
                  <div className="font-extrabold text-xs">Личный чат</div>
                  <div className="text-[10px] text-slate-500">im.message</div>
                </div>
              </button>
            </div>
          </div>

          {/* Quick Templates */}
          <div>
            <div className="flex items-center gap-1 text-xs font-bold text-slate-700 mb-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Быстрые шаблоны статусов</span>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1">
              {NOTIFICATION_TEMPLATES.map((tpl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => applyTemplate(tpl.text)}
                  className="px-2.5 py-1 text-[11px] rounded-lg bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-800 transition-colors font-medium text-left cursor-pointer border border-slate-200/60"
                >
                  {tpl.title}
                </button>
              ))}
            </div>
          </div>

          {/* Message Text */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Текст уведомления</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              placeholder="Введите текст сообщения или выберите шаблон выше..."
              required
              className="w-full p-3 text-xs border border-slate-300 rounded-2xl focus:ring-2 focus:ring-blue-500 text-slate-900"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSending}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs transition-colors cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={isSending}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Отправка...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Отправить в Битрикс24</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

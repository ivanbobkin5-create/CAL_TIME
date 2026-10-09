import React, { useState, useEffect, useRef } from "react";
import {
  X,
  MessageSquare,
  Send,
  Loader2,
  Paperclip,
  Image as ImageIcon,
  Building2,
  Factory,
  Bell,
  CheckCheck,
  User,
  ExternalLink,
  Trash2
} from "lucide-react";
import { cn } from "../../lib/utils";
import { getBitrix24Context } from "../../services/bitrix24";
import { useBitrixModalScroll } from "../../hooks/useBitrixModalScroll";

interface B2BOrderChatModalProps {
  orderId: string;
  orderName?: string;
  currentCompanyId: string;
  currentCompanyName?: string;
  currentCompanyType?: "Салон" | "Дизайнер" | "Производство" | string;
  partnerCompanyId?: string;
  partnerCompanyName?: string;
  partnerDealId?: string | number | null;
  currentDealId?: string | number | null;
  onClose: () => void;
  showAlert?: (title: string, msg: string) => void;
}

interface ChatMessage {
  id: string;
  orderId: string;
  senderCompanyId: string;
  senderCompanyName: string;
  senderType: "salon" | "production";
  senderUserName: string;
  senderUserPhone?: string;
  text: string;
  attachments?: Array<{ name: string; url?: string; base64?: string }>;
  createdAt: string;
}

export const B2BOrderChatModal: React.FC<B2BOrderChatModalProps> = ({
  orderId,
  orderName,
  currentCompanyId,
  currentCompanyName = "Моя компания",
  currentCompanyType = "Салон",
  partnerCompanyId,
  partnerCompanyName = "Партнер",
  partnerDealId,
  currentDealId,
  onClose,
  showAlert = (t, m) => alert(`${t}: ${m}`)
}) => {
  const { modalRef, paddingTop } = useBitrixModalScroll(true);
  const b24Context = getBitrix24Context();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [attachments, setAttachments] = useState<Array<{ name: string; base64: string }>>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isProduction =
    currentCompanyType === "Производство" ||
    currentCompanyType === "Фабрика" ||
    currentCompanyType === "manufacturer";

  const senderType: "salon" | "production" = isProduction ? "production" : "salon";

  // Load chat messages
  const loadMessages = async () => {
    try {
      const linkedDeal = currentDealId || partnerDealId || b24Context?.dealId;
      const url = `/api/bitrix24/b2b-chat/messages?orderId=${encodeURIComponent(orderId)}${linkedDeal ? `&dealId=${encodeURIComponent(String(linkedDeal))}` : ''}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (e) {
      console.error("Error loading chat messages:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 4000);
    return () => clearInterval(interval);
  }, [orderId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result as string;
        if (result) {
          setAttachments((prev) => [...prev, { name: file.name, base64: result }]);
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanText = inputText.trim();
    if (!cleanText && attachments.length === 0) return;

    setIsSending(true);
    try {
      const payload = {
        orderId,
        orderName,
        senderCompanyId: currentCompanyId,
        senderCompanyName: currentCompanyName,
        senderType,
        senderUserName: b24Context?.userName || "Менеджер",
        senderUserPhone: b24Context?.userPhone || "",
        text: cleanText,
        attachments,
        targetCompanyId: partnerCompanyId,
        targetDealId: partnerDealId,
        currentDealId: currentDealId || b24Context?.dealId,
        dealId: currentDealId || partnerDealId || b24Context?.dealId
      };

      const res = await fetch("/api/bitrix24/b2b-chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.message) {
          setMessages((prev) => [...prev, data.message]);
          setInputText("");
          setAttachments([]);
        }
      } else {
        showAlert("Ошибка", "Не удалось отправить сообщение");
      }
    } catch (err: any) {
      console.error("Send message error:", err);
      showAlert("Ошибка", err.message || "Сбой отправки сообщения");
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div ref={modalRef} style={{ paddingTop: paddingTop > 0 ? `${paddingTop}px` : undefined }} className="fixed inset-0 z-[100] flex items-start justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl h-[85vh] max-h-[750px] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-4 sm:p-5 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 text-indigo-400 border border-indigo-400/30 flex items-center justify-center shrink-0">
              <MessageSquare className="w-5 h-5 text-indigo-300" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base truncate">
                  Чат по заказу: {orderName || `#${orderId.slice(0, 8)}`}
                </h3>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300 mt-0.5">
                <span className="flex items-center gap-1 text-cyan-300 font-bold">
                  <Building2 className="w-3.5 h-3.5" />
                  {isProduction ? partnerCompanyName : currentCompanyName}
                </span>
                <span className="text-slate-500">⇄</span>
                <span className="flex items-center gap-1 text-indigo-300 font-bold">
                  <Factory className="w-3.5 h-3.5" />
                  {isProduction ? currentCompanyName : partnerCompanyName}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-indigo-500/20 text-indigo-200 border border-indigo-500/30 rounded-full text-[11px] font-bold">
              <Bell className="w-3 h-3 text-amber-400" />
              <span>Колокольчик Б24 активен</span>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all cursor-pointer text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/70">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full py-12">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
              <p className="text-xs text-slate-500 font-bold">Загрузка переписки...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-12 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center mx-auto border border-indigo-100">
                <MessageSquare className="w-7 h-7" />
              </div>
              <div>
                <h4 className="font-extrabold text-slate-800 text-sm">
                  Диалог между Салоном и Фабрикой пока пуст
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  Напишите первое сообщение: уточните цвет фасадов, петли, сроки или прикрепите эскиз.
                  Партнеру моментально придет уведомление в колокольчик его Битрикс24!
                </p>
              </div>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.senderCompanyId === currentCompanyId;

              return (
                <div
                  key={msg.id}
                  className={cn("flex flex-col max-w-[85%] sm:max-w-[75%]", isMe ? "ml-auto items-end" : "mr-auto items-start")}
                >
                  {/* Sender metadata */}
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold mb-1 px-1">
                    <span className={cn(msg.senderType === "production" ? "text-indigo-600" : "text-cyan-700")}>
                      {msg.senderType === "production" ? "🏭 Фабрика" : "🏬 Салон"}: {msg.senderCompanyName}
                    </span>
                    <span>•</span>
                    <span>{msg.senderUserName}</span>
                    <span>•</span>
                    <span>{new Date(msg.createdAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>

                  {/* Bubble */}
                  <div
                    className={cn(
                      "p-3.5 rounded-2xl text-xs space-y-2 shadow-2xs leading-relaxed",
                      isMe
                        ? "bg-gradient-to-br from-indigo-600 to-blue-600 text-white rounded-tr-xs"
                        : "bg-white text-slate-800 border border-slate-200/80 rounded-tl-xs"
                    )}
                  >
                    <p className="whitespace-pre-wrap">{msg.text}</p>

                    {/* Attachments */}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/20">
                        {msg.attachments.map((att, attIdx) => (
                          <div
                            key={attIdx}
                            className="rounded-xl overflow-hidden border border-black/10 bg-black/10 max-h-36 relative group"
                          >
                            {att.base64 ? (
                              <img src={att.base64} alt={att.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="p-2 text-[10px] font-bold truncate">{att.name}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Attachment preview row */}
        {attachments.length > 0 && (
          <div className="px-4 py-2 bg-slate-100 border-t border-slate-200 flex items-center gap-2 overflow-x-auto shrink-0">
            {attachments.map((att, idx) => (
              <div
                key={idx}
                className="relative rounded-xl overflow-hidden border border-slate-300 w-12 h-12 shrink-0 group"
              >
                <img src={att.base64} alt={att.name} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                  className="absolute inset-0 bg-red-600/80 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input Bar */}
        <div className="p-3 sm:p-4 bg-white border-t border-slate-200 shrink-0">
          <form onSubmit={handleSendMessage} className="flex items-end gap-2">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              multiple
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer shrink-0"
              title="Прикрепить фото или эскиз"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            <div className="flex-1 relative">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={2}
                placeholder="Напишите сообщение партнеру... (Ctrl+Enter для отправки)"
                className="w-full p-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none text-slate-900"
              />
            </div>

            <button
              type="submit"
              disabled={isSending || (!inputText.trim() && attachments.length === 0)}
              className="w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shadow-md transition-all cursor-pointer shrink-0 disabled:opacity-40"
              title="Отправить (Ctrl+Enter)"
            >
              {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </form>

          <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 px-1">
            <span>
              💡 Отправитель: <strong>{isProduction ? "Производство" : "Салон"}</strong> ({currentCompanyName})
            </span>
            <span className="hidden sm:inline">
              Мгновенное уведомление в колокольчик менеджера Битрикс24
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};

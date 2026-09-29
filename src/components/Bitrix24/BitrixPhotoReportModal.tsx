import React, { useState, useEffect } from "react";
import {
  X,
  Camera,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Trash2,
  Send,
  Loader2,
  Image as ImageIcon,
  Check,
  ShieldCheck,
  User,
  Phone,
  FileCheck,
  History
} from "lucide-react";
import { cn } from "../../lib/utils";
import {
  submitBitrix24PhotoReport,
  fetchBitrix24TimelineHistory,
  getBitrix24Context,
  PhotoReportPayload
} from "../../services/bitrix24";

interface BitrixPhotoReportModalProps {
  dealId?: number | string | null;
  dealTitle?: string;
  companyId: string;
  onClose: () => void;
  showAlert?: (title: string, message: string) => void;
  onSuccess?: () => void;
}

interface PhotoItem {
  id: string;
  name: string;
  category: string;
  dataUrl: string;
}

const PHOTO_CATEGORIES = [
  "Общий вид гарнитура",
  "Фасады и ровность зазоров",
  "Внутреннее наполнение и фурнитура",
  "Столешница и примыкания",
  "Врезка техники и мойки",
  "Подписанный Акт приема-передачи",
  "Прочее"
];

export const BitrixPhotoReportModal: React.FC<BitrixPhotoReportModalProps> = ({
  dealId: initialDealId,
  dealTitle,
  companyId,
  onClose,
  showAlert = (title, msg) => alert(`${title}: ${msg}`),
  onSuccess
}) => {
  const b24Context = getBitrix24Context();
  const currentDealId = initialDealId || b24Context?.dealId || "";

  const [dealIdInput, setDealIdInput] = useState<string>(String(currentDealId || ""));
  const [installerName, setInstallerName] = useState<string>(b24Context?.userName || "");
  const [installerPhone, setInstallerPhone] = useState<string>(b24Context?.userPhone || "");
  const [status, setStatus] = useState<"completed" | "with_remarks" | "in_progress">("completed");
  const [comment, setComment] = useState<string>("");
  const [notifyResponsible, setNotifyResponsible] = useState<boolean>(true);

  // Checklists
  const [checklist, setChecklist] = useState<Record<string, boolean>>({
    level: true,
    hardware: true,
    appliances: true,
    cleanliness: true,
    actSigned: true
  });

  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>(PHOTO_CATEGORIES[0]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"form" | "history">("form");
  const [historyReports, setHistoryReports] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  // Load history if deal is present
  useEffect(() => {
    if (!companyId) return;
    const loadHistory = async () => {
      setLoadingHistory(true);
      try {
        const hist = await fetchBitrix24TimelineHistory(companyId, dealIdInput || undefined);
        setHistoryReports(hist.photoReports || []);
      } catch (err) {
        console.error("Error loading reports history:", err);
      } finally {
        setLoadingHistory(false);
      }
    };
    loadHistory();
  }, [companyId, dealIdInput]);

  const toggleChecklist = (key: string) => {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const result = uploadEvent.target?.result as string;
        if (result) {
          const newPhoto: PhotoItem = {
            id: `photo_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            name: file.name,
            category: selectedCategory,
            dataUrl: result
          };
          setPhotos((prev) => [...prev, newPhoto]);
        }
      };
      reader.readAsDataURL(file);
    });
    // Reset input
    e.target.value = "";
  };

  const removePhoto = (id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanDealId = dealIdInput.trim();
    if (!cleanDealId) {
      showAlert("Внимание", "Укажите ID сделки Битрикс24");
      return;
    }

    if (!installerName.trim()) {
      showAlert("Внимание", "Укажите имя монтажника или номер бригады");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: PhotoReportPayload = {
        companyId,
        dealId: cleanDealId,
        installerName: installerName.trim(),
        installerPhone: installerPhone.trim(),
        status,
        comment: comment.trim(),
        checklist,
        photos: photos.map((p) => ({
          name: p.name,
          category: p.category,
          base64: p.dataUrl
        })),
        notifyResponsible
      };

      const result = await submitBitrix24PhotoReport(payload);

      if (result.success) {
        showAlert(
          "Успешно!",
          `Фотоотчет монтажа успешно зафиксирован в таймлайне сделки Битрикс24 #${cleanDealId}${
            notifyResponsible ? " и менеджеру отправлено уведомление в колокольчик!" : "!"
          }`
        );
        if (onSuccess) onSuccess();
        onClose();
      } else {
        showAlert("Ошибка", result.message || "Не удалось отправить фотоотчет в Битрикс24");
      }
    } catch (err: any) {
      console.error("Submit photo report error:", err);
      showAlert("Ошибка", err.message || "Сбой отправки фотоотчета");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 p-5 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center border border-white/30 shadow-inner">
              <Camera className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-lg leading-tight">Фотоотчет монтажа мебели</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/20 border border-white/30">
                  Битрикс24 CRM
                </span>
              </div>
              <p className="text-xs text-blue-100 mt-0.5">
                Публикация в таймлайн сделки + уведомление в колокольчик (im.notify)
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

        {/* Tab switch */}
        <div className="px-6 pt-3 border-b border-slate-100 flex items-center gap-2 bg-slate-50 shrink-0">
          <button
            onClick={() => setActiveTab("form")}
            className={cn(
              "px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5",
              activeTab === "form"
                ? "border-blue-600 text-blue-600 bg-white rounded-t-lg shadow-2xs"
                : "border-transparent text-slate-500 hover:text-slate-800"
            )}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Сдать фотоотчет</span>
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={cn(
              "px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5",
              activeTab === "history"
                ? "border-blue-600 text-blue-600 bg-white rounded-t-lg shadow-2xs"
                : "border-transparent text-slate-500 hover:text-slate-800"
            )}
          >
            <History className="w-3.5 h-3.5" />
            <span>История отчетов ({historyReports.length})</span>
          </button>
        </div>

        {/* Body */}
        {activeTab === "form" ? (
          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1">
            {/* Deal and Installer Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ID Сделки в Битрикс24 <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-bold text-xs">
                    #
                  </span>
                  <input
                    type="number"
                    value={dealIdInput}
                    onChange={(e) => setDealIdInput(e.target.value)}
                    placeholder="Например, 1042"
                    required
                    className="w-full pl-7 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-bold text-slate-900 bg-slate-50"
                  />
                </div>
                {dealTitle && (
                  <p className="text-[10px] text-slate-400 truncate mt-1">Сделка: {dealTitle}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Монтажник / Бригада <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={installerName}
                    onChange={(e) => setInstallerName(e.target.value)}
                    placeholder="Иванов А.В."
                    required
                    className="w-full pl-8 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Телефон монтажника</label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="tel"
                    value={installerPhone}
                    onChange={(e) => setInstallerPhone(e.target.value)}
                    placeholder="+7 (999) 000-00-00"
                    className="w-full pl-8 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900"
                  />
                </div>
              </div>
            </div>

            {/* Status Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">Статус монтажа</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setStatus("completed")}
                  className={cn(
                    "p-3 rounded-2xl border text-left flex items-start gap-2.5 transition-all cursor-pointer",
                    status === "completed"
                      ? "border-emerald-500 bg-emerald-50/70 text-emerald-950 ring-2 ring-emerald-500/20 shadow-xs"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  )}
                >
                  <CheckCircle2
                    className={cn(
                      "w-4 h-4 shrink-0 mt-0.5",
                      status === "completed" ? "text-emerald-600" : "text-slate-400"
                    )}
                  />
                  <div>
                    <div className="font-extrabold text-xs">Успешно завершен</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Все смонтировано, акт подписан</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setStatus("with_remarks")}
                  className={cn(
                    "p-3 rounded-2xl border text-left flex items-start gap-2.5 transition-all cursor-pointer",
                    status === "with_remarks"
                      ? "border-amber-500 bg-amber-50/70 text-amber-950 ring-2 ring-amber-500/20 shadow-xs"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  )}
                >
                  <AlertTriangle
                    className={cn(
                      "w-4 h-4 shrink-0 mt-0.5",
                      status === "with_remarks" ? "text-amber-600" : "text-slate-400"
                    )}
                  />
                  <div>
                    <div className="font-extrabold text-xs">Есть замечания</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Требуется доработка / рекламация</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setStatus("in_progress")}
                  className={cn(
                    "p-3 rounded-2xl border text-left flex items-start gap-2.5 transition-all cursor-pointer",
                    status === "in_progress"
                      ? "border-blue-500 bg-blue-50/70 text-blue-950 ring-2 ring-blue-500/20 shadow-xs"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  )}
                >
                  <Clock
                    className={cn(
                      "w-4 h-4 shrink-0 mt-0.5",
                      status === "in_progress" ? "text-blue-600" : "text-slate-400"
                    )}
                  />
                  <div>
                    <div className="font-extrabold text-xs">В процессе</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Промежуточный фотоотчет дня</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Checklist */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 mb-1">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span>Чек-лист контроля качества монтажа</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={checklist.level}
                    onChange={() => toggleChecklist("level")}
                    className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="text-slate-700">Уровень и геометрия проверены</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={checklist.hardware}
                    onChange={() => toggleChecklist("hardware")}
                    className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="text-slate-700">Петли, фасады и доводчики отрегулированы</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={checklist.appliances}
                    onChange={() => toggleChecklist("appliances")}
                    className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="text-slate-700">Врезка мойки и техники загерметизирована</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={checklist.cleanliness}
                    onChange={() => toggleChecklist("cleanliness")}
                    className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="text-slate-700">Пленки сняты, мусор убран</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-slate-100 transition-colors sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={checklist.actSigned}
                    onChange={() => toggleChecklist("actSigned")}
                    className="w-4 h-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500 cursor-pointer"
                  />
                  <span className="text-slate-900 font-bold flex items-center gap-1">
                    <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Акт приема-передачи подписан заказчиком без претензий
                  </span>
                </label>
              </div>
            </div>

            {/* Photo Upload Section */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-blue-600" />
                  <span>Фотографии монтажа ({photos.length})</span>
                </label>
                <div className="flex items-center gap-1 text-[11px] text-slate-500">
                  <span>Категория для новых фото:</span>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="text-[11px] font-bold border border-slate-300 rounded-lg px-2 py-1 bg-white text-slate-700"
                  >
                    {PHOTO_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Upload Dropzone */}
              <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50/50 hover:bg-blue-50/20 rounded-2xl p-5 text-center transition-all relative">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  capture="environment"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  title="Выберите фото или сфотографируйте"
                />
                <div className="space-y-2 pointer-events-none">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto">
                    <Camera className="w-5 h-5" />
                  </div>
                  <div className="text-xs font-bold text-slate-800">
                    Нажмите, чтобы сделать фото с камеры или выбрать файлы
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Поддерживаются JPG, PNG, WEBP. Можно загрузить сразу несколько фото.
                  </p>
                </div>
              </div>

              {/* Photos Grid */}
              {photos.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-2">
                  {photos.map((photo) => (
                    <div
                      key={photo.id}
                      className="group relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 aspect-square shadow-2xs"
                    >
                      <img
                        src={photo.dataUrl}
                        alt={photo.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-90 p-2 flex flex-col justify-between">
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => removePhoto(photo.id)}
                            className="w-6 h-6 rounded-lg bg-red-600 text-white flex items-center justify-center shadow-md hover:bg-red-700 transition-colors cursor-pointer"
                            title="Удалить фото"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-600/90 text-white truncate block max-w-full">
                            {photo.category}
                          </span>
                          <span className="text-[10px] text-white/90 truncate block mt-0.5">
                            {photo.name}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Comment */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Комментарий монтажника / Заметки для менеджера
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                placeholder="Например: Гарнитур собран за 6 часов, вся фурнитура отрегулирована идеально, клиент подписал акт и поблагодарил бригаду."
                className="w-full p-3 text-xs border border-slate-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900"
              />
            </div>

            {/* Notification Checkbox */}
            <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-blue-950">
                    Уведомление в колокольчик (im.notify)
                  </div>
                  <div className="text-[11px] text-blue-700">
                    Отправить мгновенное оповещение менеджеру сделки в Битрикс24
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={notifyResponsible}
                onChange={(e) => setNotifyResponsible(e.target.checked)}
                className="w-5 h-5 rounded text-blue-600 border-blue-300 focus:ring-blue-500 cursor-pointer shrink-0"
              />
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs transition-colors cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-extrabold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Отправка в Битрикс24...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Отправить в таймлайн сделки</span>
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          /* History View */
          <div className="p-6 overflow-y-auto flex-1 space-y-4">
            {loadingHistory ? (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
                <p className="text-xs text-slate-500 mt-2">Загрузка истории фотоотчетов...</p>
              </div>
            ) : historyReports.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                <Camera className="w-10 h-10 text-slate-300 mx-auto" />
                <h4 className="font-bold text-slate-700 text-sm">Фотоотчеты пока не сдавались</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Здесь сохраняется архив всех сданных фотоотчетов монтажа с привязкой к сделке Битрикс24.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {historyReports.map((rep) => (
                  <div
                    key={rep.id}
                    className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-blue-400 hover:shadow-xs transition-all space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider",
                            rep.status === "completed"
                              ? "bg-emerald-100 text-emerald-800"
                              : rep.status === "with_remarks"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-blue-100 text-blue-800"
                          )}
                        >
                          {rep.status === "completed"
                            ? "✅ Завершен"
                            : rep.status === "with_remarks"
                            ? "⚠️ С замечаниями"
                            : "⏳ В процессе"}
                        </span>
                        <span className="text-xs font-bold text-slate-900">
                          Сделка #{rep.dealId}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {new Date(rep.createdAt).toLocaleString("ru-RU")}
                      </span>
                    </div>

                    <div className="text-xs text-slate-700 flex flex-wrap items-center gap-4">
                      <div>
                        <span className="text-slate-400">Монтажник: </span>
                        <span className="font-bold">{rep.installerName}</span>
                        {rep.installerPhone && ` (${rep.installerPhone})`}
                      </div>
                      <div>
                        <span className="text-slate-400">Фотографий: </span>
                        <span className="font-bold">{rep.photosCount || rep.photos?.length || 0}</span>
                      </div>
                    </div>

                    {rep.comment && (
                      <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 italic">
                        «{rep.comment}»
                      </p>
                    )}

                    {rep.photos && rep.photos.length > 0 && (
                      <div className="flex items-center gap-2 overflow-x-auto py-1">
                        {rep.photos.map((p: any, idx: number) => (
                          <div
                            key={idx}
                            className="w-14 h-14 rounded-xl border border-slate-200 bg-slate-100 overflow-hidden shrink-0"
                          >
                            {p.url ? (
                              <img src={p.url} alt={p.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400">
                                Фото {idx + 1}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

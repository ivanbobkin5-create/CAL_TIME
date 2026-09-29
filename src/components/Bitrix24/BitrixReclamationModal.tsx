import React, { useState, useEffect } from "react";
import {
  X,
  AlertOctagon,
  AlertTriangle,
  Upload,
  Camera,
  Trash2,
  Send,
  Loader2,
  CheckCircle2,
  CheckSquare,
  Building2,
  User,
  Phone,
  Wrench,
  Clock,
  History,
  FileWarning
} from "lucide-react";
import { cn } from "../../lib/utils";
import {
  submitBitrix24Reclamation,
  fetchBitrix24TimelineHistory,
  getBitrix24Context,
  ReclamationPayload
} from "../../services/bitrix24";

interface BitrixReclamationModalProps {
  dealId?: number | string | null;
  dealTitle?: string;
  companyId: string;
  onClose: () => void;
  showAlert?: (title: string, message: string) => void;
  onSuccess?: () => void;
}

const RECLAMATION_TYPES = [
  "Брак детали (скол / царапина)",
  "Ошибка присадки / отверстий",
  "Ошибка раскроя / размеры",
  "Дефект кромкооблицовки",
  "Брак фасада (пленка / эмаль)",
  "Недостача фурнитуры",
  "Бой стекла / зеркала",
  "Повреждение при доставке",
  "Ошибка замера помещения",
  "Претензия заказчика"
];

const DEPARTMENTS = [
  "Цех раскроя ЛДСП",
  "Участок кромкооблицовки",
  "Сверлильно-присадочный цех",
  "Фасадный / малярный цех",
  "Склад / Комплектация",
  "Служба доставки",
  "Монтажная бригада",
  "Замерщик / Конструктор",
  "Поставщик материалов"
];

interface PhotoItem {
  id: string;
  name: string;
  dataUrl: string;
}

export const BitrixReclamationModal: React.FC<BitrixReclamationModalProps> = ({
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
  const [priority, setPriority] = useState<"critical" | "high" | "normal">("high");
  const [reclamationType, setReclamationType] = useState<string>(RECLAMATION_TYPES[0]);
  const [partName, setPartName] = useState<string>("");
  const [department, setDepartment] = useState<string>(DEPARTMENTS[0]);
  const [applicantName, setApplicantName] = useState<string>(b24Context?.userName || "");
  const [applicantPhone, setApplicantPhone] = useState<string>(b24Context?.userPhone || "");
  const [description, setDescription] = useState<string>("");
  const [requiredAction, setRequiredAction] = useState<string>("");
  const [createTask, setCreateTask] = useState<boolean>(true);
  const [notifyResponsible, setNotifyResponsible] = useState<boolean>(true);

  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"form" | "history">("form");
  const [historyReclamations, setHistoryReclamations] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  useEffect(() => {
    if (!companyId) return;
    const loadHistory = async () => {
      setLoadingHistory(true);
      try {
        const hist = await fetchBitrix24TimelineHistory(companyId, dealIdInput || undefined);
        setHistoryReclamations(hist.reclamations || []);
      } catch (err) {
        console.error("Error loading reclamations history:", err);
      } finally {
        setLoadingHistory(false);
      }
    };
    loadHistory();
  }, [companyId, dealIdInput]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const result = uploadEvent.target?.result as string;
        if (result) {
          const newPhoto: PhotoItem = {
            id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            name: file.name,
            dataUrl: result
          };
          setPhotos((prev) => [...prev, newPhoto]);
        }
      };
      reader.readAsDataURL(file);
    });
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

    if (!partName.trim()) {
      showAlert("Внимание", "Укажите наименование детали или элемента рекламации");
      return;
    }

    if (!description.trim()) {
      showAlert("Внимание", "Опишите дефект детали или суть претензии");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: ReclamationPayload = {
        companyId,
        dealId: cleanDealId,
        reclamationType,
        partName: partName.trim(),
        priority,
        department,
        applicantName: applicantName.trim(),
        applicantPhone: applicantPhone.trim(),
        description: description.trim(),
        requiredAction: requiredAction.trim(),
        photos: photos.map((p) => ({
          name: p.name,
          base64: p.dataUrl
        })),
        createTask,
        notifyResponsible
      };

      const result = await submitBitrix24Reclamation(payload);

      if (result.success) {
        let msg = `Рекламация успешно зафиксирована в таймлайне сделки #${cleanDealId}!`;
        if (result.taskId) {
          msg += ` Создана задача в Битрикс24 #${result.taskId}.`;
        }
        if (notifyResponsible) {
          msg += ` Менеджер получил уведомление в колокольчик.`;
        }
        showAlert("Рекламация зарегистрирована", msg);
        if (onSuccess) onSuccess();
        onClose();
      } else {
        showAlert("Ошибка", result.message || "Не удалось отправить рекламацию");
      }
    } catch (err: any) {
      console.error("Submit reclamation error:", err);
      showAlert("Ошибка", err.message || "Сбой при регистрации рекламации");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-600 via-red-600 to-amber-600 p-5 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center border border-white/30 shadow-inner">
              <AlertOctagon className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-lg leading-tight">Прием и фиксация рекламации</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/20 border border-white/30">
                  Битрикс24
                </span>
              </div>
              <p className="text-xs text-rose-100 mt-0.5">
                Запись в таймлайн CRM + задача исполнителю + оповещение в колокольчик (im.notify)
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
                ? "border-rose-600 text-rose-600 bg-white rounded-t-lg shadow-2xs"
                : "border-transparent text-slate-500 hover:text-slate-800"
            )}
          >
            <FileWarning className="w-3.5 h-3.5" />
            <span>Оформить рекламацию</span>
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={cn(
              "px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5",
              activeTab === "history"
                ? "border-rose-600 text-rose-600 bg-white rounded-t-lg shadow-2xs"
                : "border-transparent text-slate-500 hover:text-slate-800"
            )}
          >
            <History className="w-3.5 h-3.5" />
            <span>Журнал рекламаций ({historyReclamations.length})</span>
          </button>
        </div>

        {/* Body */}
        {activeTab === "form" ? (
          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
            {/* Urgency / Priority Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Срочность рекламации
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPriority("critical")}
                  className={cn(
                    "p-3 rounded-2xl border text-left flex items-start gap-2.5 transition-all cursor-pointer",
                    priority === "critical"
                      ? "border-rose-600 bg-rose-50 text-rose-950 ring-2 ring-rose-500/20 shadow-xs"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  )}
                >
                  <AlertOctagon
                    className={cn(
                      "w-4 h-4 shrink-0 mt-0.5",
                      priority === "critical" ? "text-rose-600" : "text-slate-400"
                    )}
                  />
                  <div>
                    <div className="font-extrabold text-xs text-rose-700">🔴 Критично</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Монтаж остановлен на объекте</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPriority("high")}
                  className={cn(
                    "p-3 rounded-2xl border text-left flex items-start gap-2.5 transition-all cursor-pointer",
                    priority === "high"
                      ? "border-amber-500 bg-amber-50 text-amber-950 ring-2 ring-amber-500/20 shadow-xs"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  )}
                >
                  <AlertTriangle
                    className={cn(
                      "w-4 h-4 shrink-0 mt-0.5",
                      priority === "high" ? "text-amber-600" : "text-slate-400"
                    )}
                  />
                  <div>
                    <div className="font-extrabold text-xs text-amber-700">🟡 Высокий</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Требуется до сдачи клиенту</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPriority("normal")}
                  className={cn(
                    "p-3 rounded-2xl border text-left flex items-start gap-2.5 transition-all cursor-pointer",
                    priority === "normal"
                      ? "border-emerald-500 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-500/20 shadow-xs"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  )}
                >
                  <Clock
                    className={cn(
                      "w-4 h-4 shrink-0 mt-0.5",
                      priority === "normal" ? "text-emerald-600" : "text-slate-400"
                    )}
                  />
                  <div>
                    <div className="font-extrabold text-xs text-emerald-700">🟢 Обычный</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Гарантийное обращение</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Deal, Applicant & Department Row */}
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
                    placeholder="1042"
                    required
                    className="w-full pl-7 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 font-bold text-slate-900 bg-slate-50"
                  />
                </div>
                {dealTitle && (
                  <p className="text-[10px] text-slate-400 truncate mt-1">Сделка: {dealTitle}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Заявитель (ФИО) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={applicantName}
                    onChange={(e) => setApplicantName(e.target.value)}
                    placeholder="Петров С.И. (монтажник)"
                    required
                    className="w-full pl-8 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Телефон заявителя</label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="tel"
                    value={applicantPhone}
                    onChange={(e) => setApplicantPhone(e.target.value)}
                    placeholder="+7 (999) 000-00-00"
                    className="w-full pl-8 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 text-slate-900"
                  />
                </div>
              </div>
            </div>

            {/* Type & Department */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Характер проблемы <span className="text-red-500">*</span>
                </label>
                <select
                  value={reclamationType}
                  onChange={(e) => setReclamationType(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 text-slate-900 bg-white font-medium"
                >
                  {RECLAMATION_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Виновный отдел / Участок
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 text-slate-900 bg-white font-medium"
                >
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Part Name & Specifications */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Наименование детали / Маркировка <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={partName}
                onChange={(e) => setPartName(e.target.value)}
                placeholder="Например: Боковина пенала левая 2140х560 ЛДСП Дуб Галифакс, кромка 1мм"
                required
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 text-slate-900"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Описание дефекта <span className="text-red-500">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Подробно опишите, что не так: скол на лицевой стороне 10 мм, отверстия под петли просверлены со смещением 15 мм..."
                required
                className="w-full p-3 text-xs border border-slate-300 rounded-2xl focus:ring-2 focus:ring-rose-500 text-slate-900"
              />
            </div>

            {/* Required Action */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Требуемое действие / Решение
              </label>
              <input
                type="text"
                value={requiredAction}
                onChange={(e) => setRequiredAction(e.target.value)}
                placeholder="Срочный перепил детали в цеху, замена петли, выезд технолога"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 text-slate-900"
              />
            </div>

            {/* Photos of Defect */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-rose-600" />
                <span>Фотографии дефекта и этикетки детали ({photos.length})</span>
              </label>

              <div className="border-2 border-dashed border-slate-300 hover:border-rose-500 bg-slate-50/50 hover:bg-rose-50/20 rounded-2xl p-4 text-center transition-all relative">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  capture="environment"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="space-y-1.5 pointer-events-none">
                  <div className="w-9 h-9 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                    <Camera className="w-4 h-4" />
                  </div>
                  <div className="text-xs font-bold text-slate-800">
                    Нажмите, чтобы сделать фото дефекта с камеры или загрузить файл
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Сфотографируйте дефект крупно и этикетку со штрихкодом на детали
                  </p>
                </div>
              </div>

              {photos.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
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
                      <button
                        type="button"
                        onClick={() => removePhoto(photo.id)}
                        className="absolute top-2 right-2 w-6 h-6 rounded-lg bg-red-600 text-white flex items-center justify-center shadow-md hover:bg-red-700 transition-colors cursor-pointer"
                        title="Удалить фото"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Checkboxes: Task & im.notify */}
            <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <div className="text-xs font-bold text-slate-900">
                    Уведомить менеджера сделки в колокольчик (im.notify)
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Менеджер сделки получит срочное push-уведомление в Битрикс24
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={notifyResponsible}
                  onChange={(e) => setNotifyResponsible(e.target.checked)}
                  className="w-5 h-5 rounded text-rose-600 border-slate-300 focus:ring-rose-500 cursor-pointer"
                />
              </label>

              <div className="h-px bg-slate-200" />

              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <div className="text-xs font-bold text-slate-900">
                    Создать задачу в Битрикс24 CRM
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Автоматическая задача с привязкой к сделке и контролем срока (24ч / 3 дня)
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={createTask}
                  onChange={(e) => setCreateTask(e.target.checked)}
                  className="w-5 h-5 rounded text-rose-600 border-slate-300 focus:ring-rose-500 cursor-pointer"
                />
              </label>
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
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 via-red-600 to-amber-600 hover:from-rose-700 hover:to-amber-700 text-white font-extrabold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Фиксация рекламации...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Зафиксировать в Битрикс24</span>
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
                <Loader2 className="w-8 h-8 animate-spin text-rose-600 mx-auto" />
                <p className="text-xs text-slate-500 mt-2">Загрузка журнала рекламаций...</p>
              </div>
            ) : historyReclamations.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                <AlertOctagon className="w-10 h-10 text-slate-300 mx-auto" />
                <h4 className="font-bold text-slate-700 text-sm">Рекламаций по сделке нет</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Здесь сохраняется журнал всех зафиксированных претензий, брака и обращений по сделке.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {historyReclamations.map((rec) => (
                  <div
                    key={rec.id}
                    className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-rose-400 hover:shadow-xs transition-all space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider",
                            rec.priority === "critical"
                              ? "bg-rose-100 text-rose-800"
                              : rec.priority === "high"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-emerald-100 text-emerald-800"
                          )}
                        >
                          {rec.priority === "critical"
                            ? "🔴 Критично"
                            : rec.priority === "high"
                            ? "🟡 Высокий"
                            : "🟢 Обычный"}
                        </span>
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {rec.reclamationType}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {new Date(rec.createdAt).toLocaleString("ru-RU")}
                      </span>
                    </div>

                    <div className="text-xs text-slate-800">
                      <span className="font-bold text-slate-500">Деталь: </span>
                      <span className="font-bold text-slate-900">{rec.partName}</span>
                    </div>

                    {rec.description && (
                      <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        {rec.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 pt-1">
                      {rec.department && (
                        <div>
                          <span>Участок: </span>
                          <span className="font-bold text-slate-700">{rec.department}</span>
                        </div>
                      )}
                      {rec.applicantName && (
                        <div>
                          <span>Заявитель: </span>
                          <span className="font-bold text-slate-700">{rec.applicantName}</span>
                        </div>
                      )}
                      {rec.taskId && (
                        <div className="text-blue-600 font-bold">
                          Задача Битрикс24 #{rec.taskId}
                        </div>
                      )}
                    </div>
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

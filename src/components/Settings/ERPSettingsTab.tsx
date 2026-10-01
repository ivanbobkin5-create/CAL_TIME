import React, { useState, useEffect } from 'react';
import { 
  Factory, 
  Layers, 
  Link, 
  ExternalLink, 
  Copy, 
  Check, 
  CheckCircle2, 
  AlertCircle, 
  Wifi, 
  Cpu, 
  Sparkles, 
  Settings, 
  Clock, 
  FolderKanban, 
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Sliders,
  DollarSign,
  RotateCcw,
  Archive,
  Workflow,
  Scissors,
  Box,
  Package,
  CheckSquare,
  Info
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface ERPSettingsTabProps {
  companyData: any;
  setCompanyData: React.Dispatch<React.SetStateAction<any>>;
  onSaveSettings: (silent?: boolean, overrides?: any) => Promise<void>;
  showAlert: (title: string, message: string) => void;
  b24Categories: any[];
  b24Stages: any[];
  loadB24Categories: (url: string, force?: boolean) => Promise<any>;
  loadB24Stages: (url: string, categoryId: string, force?: boolean) => Promise<any>;
}

const ERP_STAGES_FOR_MAPPING = [
  { id: 'queue', name: 'Очередь / Планирование производства', icon: Clock, badgeBg: 'bg-slate-100 text-slate-700 border-slate-200' },
  { id: 'cutting', name: 'Участок раскроя (Распил)', icon: Scissors, badgeBg: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'edging', name: 'Участок кромкооблицовки', icon: Layers, badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { id: 'cnc', name: 'Участок присадки / ЧПУ', icon: Cpu, badgeBg: 'bg-purple-50 text-purple-700 border-purple-200' },
  { id: 'facades', name: 'Фасады / МДФ и покраска', icon: Sparkles, badgeBg: 'bg-amber-50 text-amber-700 border-amber-200' },
  { id: 'assembly', name: 'Участок сборки корпусов', icon: Settings, badgeBg: 'bg-teal-50 text-teal-700 border-teal-200' },
  { id: 'kitting', name: 'Комплектовка фурнитуры', icon: Box, badgeBg: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  { id: 'qc', name: 'Контроль ОТК', icon: ShieldCheck, badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { id: 'packing', name: 'Упаковка и склад мест', icon: Package, badgeBg: 'bg-orange-50 text-orange-700 border-orange-200' },
  { id: 'ready', name: 'Готово к отгрузке / Завершено', icon: CheckCircle2, badgeBg: 'bg-green-50 text-green-700 border-green-200' },
];

function transliterate(str: string): string {
  if (!str) return "";
  const ruMap: Record<string, string> = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo', 'ж': 'zh',
    'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o',
    'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'ts',
    'ч': 'ch', 'ш': 'sh', 'щ': 'sch', 'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu',
    'я': 'ya'
  };
  
  return str
    .toLowerCase()
    .split('')
    .map((char) => ruMap[char] !== undefined ? ruMap[char] : (/[a-z0-9]/.test(char) ? char : ''))
    .join('')
    .replace(/[^a-z0-9-]/g, '');
}

export const ERPSettingsTab: React.FC<ERPSettingsTabProps> = ({
  companyData,
  setCompanyData,
  onSaveSettings,
  showAlert,
  b24Categories,
  b24Stages,
  loadB24Categories,
  loadB24Stages
}) => {
  const [copied, setCopied] = useState(false);
  const [isTestingB24, setIsTestingB24] = useState(false);

  const companySlug = companyData?.slug || companyData?.companySlug || (companyData?.name ? transliterate(companyData.name) : '') || companyData?.id || 'company';
  const currentOrigin = typeof window !== "undefined" ? window.location.origin : "https://mebel-plan.ru";
  const erpUrl = `${currentOrigin}/${companySlug}/erp`;

  // Extract ERP config with fallbacks
  const erpConfig = companyData?.erpConfig || companyData?.erpSettings || {
    orderSource: 'projects', // 'projects' | 'bitrix24'
    bitrix24CategoryId: companyData?.bitrix24?.categoryId || '0',
    bitrix24StageId: companyData?.bitrix24?.stageId || '',
    bitrix24DoneStageId: '',
    projectStartStatus: 'in_progress',
    workDayStart: '08:00',
    workDayEnd: '20:00',
    cuttingRatePerM2: 65,
    edgingRatePerM: 35,
    cncHoleRate: 8,
    assemblyModuleRate: 350,
    qcRatePerOrder: 500,
  };

  useEffect(() => {
    if (companyData && (!companyData.erpConfig || !companyData.erpSettings)) {
      setCompanyData((prev: any) => ({
        ...prev,
        erpConfig,
        erpSettings: erpConfig
      }));
    }
  }, []);

  const updateErpConfig = (field: string, value: any) => {
    const updated = {
      ...erpConfig,
      [field]: value
    };
    setCompanyData((prev: any) => ({
      ...prev,
      erpConfig: updated,
      erpSettings: updated,
      bitrix24: {
        ...(prev?.bitrix24 || {}),
        ...(field === 'bitrix24WebhookUrl' ? { webhookUrl: value } : {}),
        ...(field === 'bitrix24CategoryId' ? { categoryId: value } : {}),
        ...(field === 'bitrix24StageId' ? { stageId: value } : {}),
        ...(field === 'bitrix24DoneStageId' ? { doneStageId: value } : {}),
      }
    }));
  };

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(erpUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleTestBitrix24 = async () => {
    const url = companyData?.bitrix24?.webhookUrl;
    if (!url) {
      showAlert("Внимание", "Сначала укажите входящий вебхук Bitrix24 (в этом разделе или во вкладке Bitrix24)");
      return;
    }

    setIsTestingB24(true);
    try {
      const res = await fetch("/api/bitrix24/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookUrl: url })
      });
      const data = await res.json();
      if (data.success) {
        showAlert("Успех", "Соединение с Bitrix24 установлено! Списки воронок и стадий обновлены.");
        await loadB24Categories(url, true);
        await new Promise(resolve => setTimeout(resolve, 600));
        const catId = erpConfig.bitrix24CategoryId || companyData?.bitrix24?.categoryId || "0";
        await loadB24Stages(url, catId, true);
      } else {
        showAlert("Ошибка соединения", data.error || "Не удалось связаться с Bitrix24");
      }
    } catch (e) {
      showAlert("Ошибка", "Не удалось связаться с сервером");
    } finally {
      setIsTestingB24(false);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-300">
      {/* 1. Header Banner & Direct Link */}
      <div className="p-8 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl shadow-xl border border-indigo-500/30 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-black uppercase tracking-wider border border-emerald-500/30 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Лицензия ERP активна
              </span>
              <span className="px-3 py-1 rounded-full bg-white/10 text-slate-300 text-xs font-bold font-sans">
                {companyData?.name || 'Производство'}
              </span>
            </div>

            <h3 className="text-2xl font-black tracking-tight text-white flex items-center gap-3">
              <Factory className="w-7 h-7 text-indigo-400" />
              ERP система управления производством
            </h3>
            
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed font-sans">
              Полноценное рабочее пространство цеха: диспетчеризация заказов, участки раскроя, кромления, ЧПУ-присадки, сменный график мастеров и расчет сдельной оплаты труда.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto shrink-0">
            <button
              onClick={handleCopyLink}
              className="px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-bold text-xs transition-all flex items-center justify-center gap-2 border border-white/10 active:scale-95"
              title="Скопировать прямую ссылку на ERP систему"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? "Ссылка скопирована!" : "Скопировать ссылку"}</span>
            </button>

            <a
              href={`/${companySlug}/erp`}
              target="_blank"
              rel="noreferrer"
              className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold text-sm shadow-lg shadow-indigo-600/40 transition-all flex items-center justify-center gap-2.5 whitespace-nowrap active:scale-95 border border-indigo-400/30"
            >
              <span>Открыть ERP в новом окне</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        <div className="mt-6 pt-5 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-400 font-mono">
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Прямой URL для сотрудников:</span>
            <span className="text-indigo-300 font-semibold underline underline-offset-2">{erpUrl}</span>
          </div>
          <span className="text-slate-400 text-[11px]">Вход по логину и паролю сотрудников производства</span>
        </div>
      </div>

      {/* 2. B24 INTEGRATION REDIRECT CARD */}
      <section className="space-y-6">
        <div className="border-b border-gray-100 pb-4">
          <h3 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-indigo-600" />
            Интеграция с Bitrix24 CRM
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Единый центр настройки подключения Bitrix24 CRM и фильтрации заказов.
          </p>
        </div>

        <div className="p-8 bg-blue-50/50 rounded-3xl border border-blue-200/80 space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
              <Link className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                Настройки Bitrix24 выполняются в ERP-системе
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed max-w-3xl">
                Все параметры синхронизации с Битрикс24 (входящий вебхук, воронка сделок, выбор источника заказов, стадии «Начало производства» и «Готово к отгрузке», раздел «Монтаж и сборка», сопоставление участков и пользовательские поля) настраиваются <strong>уникально и единолично в ERP-системе цеха</strong> в разделе <strong>«Настройки ERP»</strong>.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-blue-200/60 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="text-xs text-slate-500 flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Единственный конфигурационный центр интеграции цеха с CRM.</span>
            </div>

            <a
              href={`/${companySlug}/erp`}
              target="_blank"
              rel="noreferrer"
              className="px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-xs shadow-md shadow-blue-600/30 transition-all flex items-center justify-center gap-2 shrink-0 active:scale-95 border border-blue-500/30"
            >
              <span>Перейти к настройкам Bitrix24 в ERP</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>

      {/* Save Button */}
      <div className="pt-4 flex justify-end">
        <button
          type="button"
          onClick={async () => {
            await onSaveSettings(false, { erpConfig });
            showAlert("Успех", "Настройки ERP успешно сохранены!");
          }}
          className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-xl shadow-indigo-200 transition-all flex items-center gap-2 active:scale-95 text-sm"
        >
          <CheckCircle2 className="w-5 h-5" />
          Сохранить настройки ERP
        </button>
      </div>
    </div>
  );
};

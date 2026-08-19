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
  DollarSign
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

  const companyAlias = companyData?.landingPage?.alias || transliterate(companyData?.name || '') || companyData?.id || 'company';
  const erpUrl = `${window.location.origin}/${companyAlias}/erp`;

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

  const updateErpConfig = (field: string, value: any) => {
    const updated = {
      ...erpConfig,
      [field]: value
    };
    setCompanyData((prev: any) => ({
      ...prev,
      erpConfig: updated,
      erpSettings: updated
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
              href={`/${companyAlias}/erp`}
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

      {/* 2. ORDER SOURCE SELECTION (Битрикс24 vs Проекты калькулятора) */}
      <section className="space-y-6">
        <div className="border-b border-gray-100 pb-4">
          <h3 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-indigo-600" />
            Источник заказов для ERP системы
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Укажите, откуда в производственную систему цеха должны поступать заказы на изготовление мебели.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Card 1: Internal Projects */}
          <div 
            onClick={() => updateErpConfig('orderSource', 'projects')}
            className={cn(
              "p-6 rounded-3xl border-2 transition-all cursor-pointer relative flex flex-col justify-between gap-4",
              erpConfig.orderSource === 'projects'
                ? "bg-indigo-50/40 border-indigo-600 shadow-md ring-4 ring-indigo-50"
                : "bg-white border-gray-200 hover:border-gray-300"
            )}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center",
                  erpConfig.orderSource === 'projects' ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600"
                )}>
                  <FolderKanban className="w-6 h-6" />
                </div>

                <div className={cn(
                  "w-6 h-6 rounded-full border-2 flex items-center justify-center",
                  erpConfig.orderSource === 'projects' ? "border-indigo-600 bg-indigo-600 text-white" : "border-gray-300"
                )}>
                  {erpConfig.orderSource === 'projects' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
              </div>

              <div>
                <h4 className="font-bold text-gray-900 text-base">Проекты калькулятора</h4>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  Заказами в ERP системе являются проекты, созданные и рассчитанные внутри «Мебельного калькулятора».
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100 text-xs text-indigo-950 bg-white/80 p-3 rounded-xl">
              <span className="font-bold block text-gray-800 mb-1">Схема работы:</span>
              <div className="flex items-center gap-1.5 text-[11px] text-gray-600 flex-wrap">
                <span className="bg-gray-100 px-2 py-0.5 rounded font-medium">Проект в калькуляторе</span>
                <ArrowRight className="w-3 h-3 text-indigo-500" />
                <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-bold">Статус «В работе»</span>
                <ArrowRight className="w-3 h-3 text-indigo-500" />
                <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-bold">В цех на раскрой/ЧПУ</span>
              </div>
            </div>
          </div>

          {/* Card 2: Bitrix24 */}
          <div 
            onClick={() => updateErpConfig('orderSource', 'bitrix24')}
            className={cn(
              "p-6 rounded-3xl border-2 transition-all cursor-pointer relative flex flex-col justify-between gap-4",
              erpConfig.orderSource === 'bitrix24'
                ? "bg-blue-50/40 border-blue-600 shadow-md ring-4 ring-blue-50"
                : "bg-white border-gray-200 hover:border-gray-300"
            )}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center",
                  erpConfig.orderSource === 'bitrix24' ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"
                )}>
                  <Link className="w-6 h-6" />
                </div>

                <div className={cn(
                  "w-6 h-6 rounded-full border-2 flex items-center justify-center",
                  erpConfig.orderSource === 'bitrix24' ? "border-blue-600 bg-blue-600 text-white" : "border-gray-300"
                )}>
                  {erpConfig.orderSource === 'bitrix24' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
              </div>

              <div>
                <h4 className="font-bold text-gray-900 text-base">Интеграция с Bitrix24 CRM</h4>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  Заказы синхронизируются из CRM Битрикс24 по указанной воронке и стадии сделки.
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100 text-xs text-blue-950 bg-white/80 p-3 rounded-xl">
              <span className="font-bold block text-gray-800 mb-1">Схема работы:</span>
              <div className="flex items-center gap-1.5 text-[11px] text-gray-600 flex-wrap">
                <span className="bg-gray-100 px-2 py-0.5 rounded font-medium">Сделка в CRM</span>
                <ArrowRight className="w-3 h-3 text-blue-500" />
                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold">Выбранная стадия</span>
                <ArrowRight className="w-3 h-3 text-blue-500" />
                <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-bold">Отображение в ERP цеха</span>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Options according to chosen source */}
        {erpConfig.orderSource === 'bitrix24' ? (
          <div className="p-6 bg-blue-50/50 rounded-3xl border border-blue-100 space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-base font-bold text-blue-950 flex items-center gap-2">
                  <Link className="w-5 h-5 text-blue-600" />
                  Параметры синхронизации сделок Bitrix24
                </h4>
                <p className="text-xs text-gray-500 mt-0.5">
                  Укажите воронку и стадию, при переходе на которую сделка попадает в ERP систему управления производством.
                </p>
              </div>

              <button
                type="button"
                onClick={handleTestBitrix24}
                disabled={isTestingB24}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
              >
                <RefreshCw className={cn("w-4 h-4", isTestingB24 && "animate-spin")} />
                <span>{isTestingB24 ? "Проверка..." : "Обновить воронки и стадии"}</span>
              </button>
            </div>

            {/* Webhook Input if empty */}
            {!companyData?.bitrix24?.webhookUrl && (
              <div className="p-4 bg-white rounded-2xl border border-amber-200 bg-amber-50/50">
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Ссылка входящего вебхука Bitrix24:
                </label>
                <input
                  type="text"
                  placeholder="https://yourdomain.bitrix24.ru/rest/1/webhook_token/..."
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  value={companyData?.bitrix24?.webhookUrl || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCompanyData((prev: any) => ({
                      ...prev,
                      bitrix24: {
                        ...(prev?.bitrix24 || {}),
                        webhookUrl: val
                      }
                    }));
                  }}
                />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {/* Category / Pipeline */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-tight">
                  Воронка сделок (Category):
                </label>
                {b24Categories.length > 0 ? (
                  <select
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-xs font-bold text-gray-800"
                    value={erpConfig.bitrix24CategoryId || "0"}
                    onChange={(e) => {
                      const newCatId = e.target.value;
                      updateErpConfig('bitrix24CategoryId', newCatId);
                      const url = companyData?.bitrix24?.webhookUrl;
                      if (url) {
                        loadB24Stages(url, newCatId, true);
                      }
                    }}
                  >
                    {b24Categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name} (ID: {cat.id})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="Например: 0"
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                    value={erpConfig.bitrix24CategoryId || ""}
                    onChange={(e) => updateErpConfig('bitrix24CategoryId', e.target.value)}
                  />
                )}
                <span className="text-[10px] text-gray-400 block">
                  Выберите воронку, в которой ведутся производственные заказы.
                </span>
              </div>

              {/* Start Stage */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-indigo-700 uppercase tracking-tight">
                  Стадия попадания в ERP (Начало производства):
                </label>
                {b24Stages.length > 0 ? (
                  <select
                    className="w-full px-4 py-3 bg-white border-2 border-indigo-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-bold text-indigo-950"
                    value={erpConfig.bitrix24StageId || ""}
                    onChange={(e) => updateErpConfig('bitrix24StageId', e.target.value)}
                  >
                    <option value="">-- Выберите стадию --</option>
                    {b24Stages.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name} ({st.id})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="Например: C1:IN_PRODUCTION"
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                    value={erpConfig.bitrix24StageId || ""}
                    onChange={(e) => updateErpConfig('bitrix24StageId', e.target.value)}
                  />
                )}
                <span className="text-[10px] text-indigo-600 block font-medium">
                  С этой стадии сделка автоматически появляется в списке производственных заказов цеха.
                </span>
              </div>

              {/* Completion Stage */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-emerald-700 uppercase tracking-tight">
                  Стадия завершения (Готово к отгрузке):
                </label>
                {b24Stages.length > 0 ? (
                  <select
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none text-xs font-bold text-gray-800"
                    value={erpConfig.bitrix24DoneStageId || ""}
                    onChange={(e) => updateErpConfig('bitrix24DoneStageId', e.target.value)}
                  >
                    <option value="">-- Не переводить автоматически --</option>
                    {b24Stages.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name} ({st.id})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="Например: C1:WON или C1:READY"
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={erpConfig.bitrix24DoneStageId || ""}
                    onChange={(e) => updateErpConfig('bitrix24DoneStageId', e.target.value)}
                  />
                )}
                <span className="text-[10px] text-emerald-600 block">
                  При прохождении ОТК в ERP, сделка в Bitrix24 переместится на эту стадию.
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 bg-indigo-50/50 rounded-3xl border border-indigo-100 space-y-4 animate-in fade-in duration-200">
            <h4 className="text-base font-bold text-indigo-950 flex items-center gap-2">
              <FolderKanban className="w-5 h-5 text-indigo-600" />
              Параметры внутренних проектов калькулятора
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-white rounded-2xl border border-gray-200 space-y-2">
                <span className="text-xs font-bold text-gray-800 block">
                  Условие отправки проекта в производственную очередь ERP:
                </span>
                <div className="space-y-2 text-xs text-gray-600">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="projectStartStatus"
                      checked={erpConfig.projectStartStatus !== 'all'}
                      onChange={() => updateErpConfig('projectStartStatus', 'in_progress')}
                      className="text-indigo-600"
                    />
                    <span>Только проекты со статусом <b>«В работе / Передан в цех»</b></span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="projectStartStatus"
                      checked={erpConfig.projectStartStatus === 'all'}
                      onChange={() => updateErpConfig('projectStartStatus', 'all')}
                      className="text-indigo-600"
                    />
                    <span>Все сохраненные проекты (включая черновики и расчеты)</span>
                  </label>
                </div>
              </div>

              <div className="p-4 bg-white rounded-2xl border border-gray-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-gray-800 block">
                    Автоматическая разбивка деталей
                  </span>
                  <span className="text-[11px] text-gray-400">
                    Генерировать технологические карты для раскроя и кромкооблицовки
                  </span>
                </div>
                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-lg">
                  Включено
                </span>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* 3. ERP Production Rates & Shift Defaults */}
      <section className="space-y-6">
        <div className="border-b border-gray-100 pb-4">
          <h3 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Sliders className="w-5 h-5 text-indigo-600" />
            Базовые расценки сдельной оплаты в цехе
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Используются для автоматического расчета зарплаты мастеров и операторов станков в ERP.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-1">
            <span className="text-[11px] font-bold text-gray-500 uppercase">Раскрой (₽/м²)</span>
            <input
              type="number"
              value={erpConfig.cuttingRatePerM2 || 65}
              onChange={(e) => updateErpConfig('cuttingRatePerM2', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-bold text-sm text-gray-800 outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-1">
            <span className="text-[11px] font-bold text-gray-500 uppercase">Кромка (₽/м.п.)</span>
            <input
              type="number"
              value={erpConfig.edgingRatePerM || 35}
              onChange={(e) => updateErpConfig('edgingRatePerM', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-bold text-sm text-gray-800 outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-1">
            <span className="text-[11px] font-bold text-gray-500 uppercase">ЧПУ присадка (₽/отв)</span>
            <input
              type="number"
              value={erpConfig.cncHoleRate || 8}
              onChange={(e) => updateErpConfig('cncHoleRate', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-bold text-sm text-gray-800 outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-1">
            <span className="text-[11px] font-bold text-gray-500 uppercase">Сборка модуля (₽/шт)</span>
            <input
              type="number"
              value={erpConfig.assemblyModuleRate || 350}
              onChange={(e) => updateErpConfig('assemblyModuleRate', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-bold text-sm text-gray-800 outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-1">
            <span className="text-[11px] font-bold text-gray-500 uppercase">ОТК / Проверка (₽/заказ)</span>
            <input
              type="number"
              value={erpConfig.qcRatePerOrder || 500}
              onChange={(e) => updateErpConfig('qcRatePerOrder', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-bold text-sm text-gray-800 outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </section>

      {/* Save Button */}
      <div className="pt-4 flex justify-end">
        <button
          type="button"
          onClick={async () => {
            await onSaveSettings(false);
            showAlert("Успех", "Настройки ERP системы успешно сохранены!");
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

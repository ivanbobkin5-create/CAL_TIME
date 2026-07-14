import { useState, useEffect } from "react";
import { 
  Globe, 
  Copy, 
  Check, 
  Phone, 
  Mail, 
  MapPin, 
  MessageSquare, 
  ExternalLink, 
  Info,
  Layers,
  Sparkles,
  MousePointerClick
} from "lucide-react";

interface LandingPageConfig {
  enabled: boolean;
  alias: string;
  title: string;
  description: string;
  welcomeText: string;
  heroBackground: string;
  phone: string;
  email: string;
  address: string;
  telegram: string;
  whatsapp: string;
  visibleCategories: string[];
}

interface LandingSettingsViewProps {
  companyData: any;
  setCompanyData: React.Dispatch<React.SetStateAction<any>>;
  productCategories: string[];
  onSaveSettings: (silent?: boolean) => void;
  showAlert: (title: string, message: string) => void;
}

// Beautiful preset gradients for the Hero section
const GRADIENT_PRESETS = [
  { id: "blue-indigo", name: "Синий Индиго", class: "bg-gradient-to-r from-blue-600 to-indigo-700" },
  { id: "emerald-teal", name: "Изумрудный Чай", class: "bg-gradient-to-r from-emerald-600 to-teal-700" },
  { id: "slate-gray", name: "Благородный Грифельный", class: "bg-gradient-to-r from-slate-700 to-slate-900" },
  { id: "orange-rose", name: "Теплый Оранжевый", class: "bg-gradient-to-r from-orange-500 to-rose-600" },
  { id: "purple-violet", name: "Королевский Фиолетовый", class: "bg-gradient-to-r from-purple-600 to-violet-800" },
];

export function LandingSettingsView({
  companyData,
  setCompanyData,
  productCategories,
  onSaveSettings,
  showAlert,
}: LandingSettingsViewProps) {
  const [copied, setCopied] = useState(false);

  // Default configuration
  const landingConfig: LandingPageConfig = {
    enabled: false,
    alias: "",
    title: "",
    description: "",
    welcomeText: "",
    heroBackground: "blue-indigo",
    phone: "",
    email: "",
    address: "",
    telegram: "",
    whatsapp: "",
    visibleCategories: [],
    ...(companyData?.landingPage || {}),
  };

  const handleUpdateConfig = (updates: Partial<LandingPageConfig>) => {
    setCompanyData((prev: any) => ({
      ...prev,
      landingPage: {
        ...landingConfig,
        ...updates,
      },
    }));
  };

  const sanitizeAlias = (val: string) => {
    // lowercase, remove non-alphanumeric and hyphens
    return val
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-");
  };

  const handleAliasChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = sanitizeAlias(e.target.value);
    handleUpdateConfig({ alias: sanitized });
  };

  const handleToggleCategory = (category: string) => {
    const current = landingConfig.visibleCategories || [];
    const next = current.includes(category)
      ? current.filter((c) => c !== category)
      : [...current, category];
    handleUpdateConfig({ visibleCategories: next });
  };

  const publicUrl = `${window.location.origin}/c/${landingConfig.alias || companyData?.id}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    showAlert("Ссылка скопирована", "Ссылка на внешний каталог скопирована в буфер обмена");
  };

  // Pre-fill fields with company general details if landing details are empty
  useEffect(() => {
    const updates: Partial<LandingPageConfig> = {};
    let hasUpdates = false;

    if (!landingConfig.title && companyData?.name) {
      updates.title = `Каталог товаров ${companyData.name}`;
      hasUpdates = true;
    }
    if (!landingConfig.phone && companyData?.phone) {
      updates.phone = companyData.phone;
      hasUpdates = true;
    }
    if (!landingConfig.address && companyData?.city) {
      updates.address = companyData.city;
      hasUpdates = true;
    }

    if (hasUpdates) {
      handleUpdateConfig(updates);
    }
  }, [companyData]);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header and Toggle */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-gray-100">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-blue-600">
            <Globe className="w-5 h-5" />
            <span className="font-extrabold text-xs uppercase tracking-wider">Внешний модуль продаж</span>
          </div>
          <h3 className="text-xl font-bold text-gray-900">Внешняя страница компании (Каталог-Заказ)</h3>
          <p className="text-sm text-gray-500 max-w-2xl">
            Настройте персональную страницу-витрину для ваших розничных покупателей. Клиенты смогут изучать товары, добавлять их в корзину и моментально отправлять заявки, которые будут создаваться как новые проекты в вашем приложении.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-gray-50 px-4 py-3 rounded-2xl border border-gray-100 self-start md:self-center select-none">
          <span className="text-sm font-bold text-gray-700">Опубликовать в сети:</span>
          <button
            onClick={() => handleUpdateConfig({ enabled: !landingConfig.enabled })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
              landingConfig.enabled ? "bg-green-500" : "bg-gray-200"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                landingConfig.enabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>

      {landingConfig.enabled && (
        <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex gap-3">
            <div className="p-2 bg-emerald-500 text-white rounded-xl">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-emerald-900">Страница активна и доступна по ссылке:</div>
              <a 
                href={publicUrl} 
                target="_blank" 
                rel="noreferrer" 
                className="text-sm text-emerald-700 hover:text-emerald-900 underline font-medium break-all flex items-center gap-1.5 mt-1"
              >
                {publicUrl}
                <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
              </a>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <button
              onClick={handleCopyLink}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white hover:bg-emerald-100 text-emerald-800 font-bold rounded-xl border border-emerald-200 shadow-sm transition-all text-sm active:scale-95"
            >
              {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              {copied ? "Скопировано!" : "Копировать ссылку"}
            </button>
            <a
              href={publicUrl}
              target="_blank"
              rel="noreferrer"
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm transition-all text-sm active:scale-95"
            >
              <MousePointerClick className="w-4 h-4" />
              Открыть витрину
            </a>
          </div>
        </div>
      )}

      {/* Main Settings Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side: General and SEO */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100 space-y-6">
            <h4 className="font-bold text-gray-900 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-blue-600 rounded-full" />
              Основная информация и брендинг
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-black uppercase text-gray-500 tracking-wider mb-2">
                  Адрес страницы (Alias)
                </label>
                <div className="flex rounded-xl shadow-sm">
                  <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-xs font-medium">
                    /c/
                  </span>
                  <input
                    type="text"
                    value={landingConfig.alias}
                    onChange={handleAliasChange}
                    placeholder={companyData?.id || "kuhni-vsem"}
                    className="block w-full min-w-0 flex-1 rounded-none rounded-r-xl border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500 font-mono"
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-gray-400">
                  Только латинские буквы, цифры и дефис. По умолчанию используется ID вашей компании.
                </p>
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-gray-500 tracking-wider mb-2">
                  Заголовок витрины
                </label>
                <input
                  type="text"
                  value={landingConfig.title}
                  onChange={(e) => handleUpdateConfig({ title: e.target.value })}
                  placeholder="Салон мебели Кухни Всем"
                  className="block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase text-gray-500 tracking-wider mb-2">
                Краткое описание / Специфика
              </label>
              <textarea
                rows={2}
                value={landingConfig.description}
                onChange={(e) => handleUpdateConfig({ description: e.target.value })}
                placeholder="Лучшие модульные кухни и мебель в городе. Выберите модули, добавьте в корзину и оформите быструю заявку на точный расчет!"
                className="block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase text-gray-500 tracking-wider mb-2">
                Приветственное сообщение (вводный блок)
              </label>
              <textarea
                rows={3}
                value={landingConfig.welcomeText}
                onChange={(e) => handleUpdateConfig({ welcomeText: e.target.value })}
                placeholder="Добро пожаловать в наш онлайн-каталог! Здесь представлены готовые модульные элементы нашего производства с актуальными розничными ценами. Оформление заявки ни к чему вас не обязывает — наши дизайнеры свяжутся с вами, составят 3D проект и ответят на все вопросы."
                className="block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase text-gray-500 tracking-wider mb-2">
                Стиль шапки (Hero фоновый градиент)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {GRADIENT_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleUpdateConfig({ heroBackground: p.id })}
                    className={`h-16 rounded-xl flex flex-col items-center justify-between p-2 text-[10px] font-bold text-white transition-all active:scale-95 border-2 ${p.class} ${
                      landingConfig.heroBackground === p.id ? "border-blue-500 scale-105 ring-2 ring-blue-500/30" : "border-transparent"
                    }`}
                  >
                    <span>{p.name}</span>
                    {landingConfig.heroBackground === p.id && <Check className="w-3.5 h-3.5 self-end" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100 space-y-6">
            <h4 className="font-bold text-gray-900 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-blue-600 rounded-full" />
              Контакты для покупателей
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-black uppercase text-gray-500 tracking-wider mb-2">
                  <Phone className="w-3.5 h-3.5 inline mr-1 text-gray-400" />
                  Телефон для связи
                </label>
                <input
                  type="text"
                  value={landingConfig.phone}
                  onChange={(e) => handleUpdateConfig({ phone: e.target.value })}
                  placeholder="+7 (999) 123-45-67"
                  className="block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-gray-500 tracking-wider mb-2">
                  <Mail className="w-3.5 h-3.5 inline mr-1 text-gray-400" />
                  Email
                </label>
                <input
                  type="email"
                  value={landingConfig.email}
                  onChange={(e) => handleUpdateConfig({ email: e.target.value })}
                  placeholder="sales@company.ru"
                  className="block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-gray-500 tracking-wider mb-2">
                  <MapPin className="w-3.5 h-3.5 inline mr-1 text-gray-400" />
                  Адрес офиса / салона
                </label>
                <input
                  type="text"
                  value={landingConfig.address}
                  onChange={(e) => handleUpdateConfig({ address: e.target.value })}
                  placeholder="г. Москва, ул. Ленина, д. 45"
                  className="block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase text-gray-500 tracking-wider mb-2">
                    Telegram Username
                  </label>
                  <input
                    type="text"
                    value={landingConfig.telegram}
                    onChange={(e) => handleUpdateConfig({ telegram: e.target.value })}
                    placeholder="company_tg"
                    className="block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-gray-500 tracking-wider mb-2">
                    WhatsApp (номер)
                  </label>
                  <input
                    type="text"
                    value={landingConfig.whatsapp}
                    onChange={(e) => handleUpdateConfig({ whatsapp: e.target.value })}
                    placeholder="79991234567"
                    className="block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Visible Categories selection */}
        <div className="space-y-6">
          <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100 space-y-6 h-full">
            <div className="space-y-1">
              <h4 className="font-bold text-gray-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600" />
                Разделы каталога
              </h4>
              <p className="text-xs text-gray-500">
                Выберите категории товаров, которые будут видны покупателям на публичной странице. 
              </p>
            </div>

            <div className="p-3 bg-blue-50 rounded-xl text-xs text-blue-800 flex gap-2 border border-blue-100">
              <Info className="w-4 h-4 flex-shrink-0" />
              <span>Если ни один раздел не выбран, на витрине отобразятся все одобренные товары компании.</span>
            </div>

            <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
              {productCategories.filter(cat => cat !== "Кромочные материалы" && cat !== "Кромка").map((category) => {
                const isSelected = (landingConfig.visibleCategories || []).includes(category);
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => handleToggleCategory(category)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border text-sm font-bold transition-all text-left ${
                      isSelected
                        ? "bg-white border-blue-500 text-blue-600 shadow-sm"
                        : "bg-white border-gray-200 text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    <span>{category}</span>
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                        isSelected ? "bg-blue-600 border-blue-600 text-white" : "border-gray-300"
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="pt-6 border-t border-gray-100 flex justify-end">
        <button
          onClick={() => onSaveSettings(false)}
          className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all flex items-center gap-2 active:scale-95"
        >
          <CheckCircle2 className="w-5 h-5" />
          Сохранить параметры витрины
        </button>
      </div>
    </div>
  );
}

// Extra import helper for SettingsView where icon is needed
function CheckCircle2(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

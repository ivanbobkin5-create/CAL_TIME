import React, { useState } from 'react';
import { Box, Code, Copy, Check, Wrench, Package, Shield, Sliders, ExternalLink, Sparkles, Monitor } from 'lucide-react';
import {
  ConstructorCompanySettings,
  DEFAULT_CONSTRUCTOR_COMPANY_SETTINGS,
} from './constructorPresets';

interface Constructor3DSettingsTabProps {
  companyData: any;
  setCompanyData: React.Dispatch<React.SetStateAction<any>>;
  onSaveSettings: (isAutoSave?: boolean) => void;
  showAlert: (title: string, message: string) => void;
}

export const Constructor3DSettingsTab: React.FC<Constructor3DSettingsTabProps> = ({
  companyData,
  setCompanyData,
  onSaveSettings,
  showAlert,
}) => {
  const settings: ConstructorCompanySettings = {
    ...DEFAULT_CONSTRUCTOR_COMPANY_SETTINGS,
    ...(companyData?.constructor3dSettings || {}),
  };

  const [formData, setFormData] = useState<ConstructorCompanySettings>(settings);
  const [copiedKind, setCopiedKind] = useState<string | null>(null);

  const companyAliasOrId = companyData?.alias || companyData?.id || 'demo';
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const widgetUrl = `${baseUrl}/widget/3d-constructor?company=${companyAliasOrId}`;

  const iframeSnippet = `<iframe 
  src="${widgetUrl}" 
  width="100%" 
  height="750px" 
  style="border: none; border-radius: 16px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1);" 
  allow="fullscreen; autoplay" 
  title="3D Конструктор кухни">
</iframe>`;

  const scriptSnippet = `<script src="${baseUrl}/widget-loader.js" data-company="${companyAliasOrId}" async></script>
<div id="kitchen-3d-constructor-widget"></div>`;

  const handleChange = (field: keyof ConstructorCompanySettings, val: any) => {
    const updated = { ...formData, [field]: val };
    setFormData(updated);
    setCompanyData((prev: any) => ({
      ...prev,
      constructor3dSettings: updated,
    }));
  };

  const handleCopy = (text: string, kind: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKind(kind);
    setTimeout(() => setCopiedKind(null), 2000);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Tab Header */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-100">
        <div>
          <h3 className="text-xl font-bold text-gray-900 font-sans flex items-center gap-2">
            <Box className="w-5 h-5 text-blue-600" />
            <span>Настройки 3D Конструктора и Виджет на сайт</span>
          </h3>
          <p className="text-xs text-gray-500 mt-1 font-sans">
            Установите маппинг артикулов фурнитуры из вашего каталога и код для встройки 3D конструктора на ваш сайт
          </p>
        </div>
        <button
          type="button"
          onClick={() => onSaveSettings(false)}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all flex items-center gap-1.5 shadow-md shadow-blue-100"
        >
          <Check className="w-4 h-4" />
          Сохранить изменения
        </button>
      </div>

      {/* SECTION 1: Hardware & Catalog Mappings */}
      <div className="space-y-6">
        <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wider font-sans flex items-center gap-2">
          <Sliders className="w-4 h-4 text-purple-600" />
          <span>1. Маппинг стандартных элементов и фурнитуры</span>
        </h4>

        {/* 1. Hinge Models */}
        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
            <Wrench className="w-4 h-4 text-purple-600" />
            <span>Петли дверных фасадов</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-600 font-medium mb-1">
                Петли накладные (стандарт)
              </label>
              <input
                type="text"
                value={formData.overlayHingeProductName}
                onChange={(e) => handleChange('overlayHingeProductName', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:border-blue-500 focus:outline-none bg-white font-medium"
                placeholder="Название из вашего каталога (e.g. BOYARD Sensys)..."
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">
                Петли полунакладные
              </label>
              <input
                type="text"
                value={formData.halfOverlayHingeProductName}
                onChange={(e) => handleChange('halfOverlayHingeProductName', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:border-blue-500 focus:outline-none bg-white font-medium"
                placeholder="Название полунакладных петель..."
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Петли вкладные</label>
              <input
                type="text"
                value={formData.insetHingeProductName}
                onChange={(e) => handleChange('insetHingeProductName', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:border-blue-500 focus:outline-none bg-white font-medium"
                placeholder="Название вкладных петель..."
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">
                Петли угловые (45°/90°/175°)
              </label>
              <input
                type="text"
                value={formData.cornerHingeProductName}
                onChange={(e) => handleChange('cornerHingeProductName', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:border-blue-500 focus:outline-none bg-white font-medium"
                placeholder="Название угловых петель..."
              />
            </div>
          </div>
        </div>

        {/* 2. Drawer Systems */}
        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
            <Package className="w-4 h-4 text-purple-600" />
            <span>Системы выдвижения ящиков</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-600 font-medium mb-1">
                Скрытого монтажа (BOYARD/Blum DB/Tandem)
              </label>
              <input
                type="text"
                value={formData.concealedDrawerProductName}
                onChange={(e) => handleChange('concealedDrawerProductName', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:border-blue-500 focus:outline-none bg-white font-medium"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">
                Тандембоксы (металлобоксы с доводчиком)
              </label>
              <input
                type="text"
                value={formData.tandemboxDrawerProductName}
                onChange={(e) => handleChange('tandemboxDrawerProductName', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:border-blue-500 focus:outline-none bg-white font-medium"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">
                Роликовые / Шариковые направляющие
              </label>
              <input
                type="text"
                value={formData.ballBearingDrawerProductName}
                onChange={(e) => handleChange('ballBearingDrawerProductName', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:border-blue-500 focus:outline-none bg-white font-medium"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">
                Направляющие Push-to-Open (без ручек)
              </label>
              <input
                type="text"
                value={formData.pushOpenDrawerProductName}
                onChange={(e) => handleChange('pushOpenDrawerProductName', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:border-blue-500 focus:outline-none bg-white font-medium"
              />
            </div>
          </div>
        </div>

        {/* 3. Supports & Handles */}
        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
            <Shield className="w-4 h-4 text-purple-600" />
            <span>Опоры и ручки по умолчанию</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-600 font-medium mb-1">
                Регулируемые кухонные опоры (100-150 мм)
              </label>
              <input
                type="text"
                value={formData.defaultLegProductName}
                onChange={(e) => handleChange('defaultLegProductName', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:border-blue-500 focus:outline-none bg-white font-medium"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">
                Ручка-скоба стандартная (межцентр. 128 мм)
              </label>
              <input
                type="text"
                value={formData.defaultHandleProductName}
                onChange={(e) => handleChange('defaultHandleProductName', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:border-blue-500 focus:outline-none bg-white font-medium"
              />
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: Website Embedding Widget Generator */}
      <div className="p-6 bg-gradient-to-br from-slate-900 to-blue-950 rounded-3xl text-white space-y-6 shadow-xl border border-blue-900/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-400/40 flex items-center justify-center text-blue-400">
              <Code className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-bold text-white font-sans flex items-center gap-2">
                <span>Виджет 3D Конструктора для вашего сайта</span>
                <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full">
                  Интеграция
                </span>
              </h4>
              <p className="text-xs text-slate-400 font-sans mt-0.5">
                Разместите 3D калькулятор-конструктор на вашем веб-сайте для прямого приёма заявок покупателей
              </p>
            </div>
          </div>
          {widgetUrl && (
            <a
              href={widgetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-md"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Открыть 3D виджет</span>
            </a>
          )}
        </div>

        {/* Code Snippet Box 1: iframe */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-300 font-semibold font-sans">
            <span className="flex items-center gap-1.5">
              <Monitor className="w-4 h-4 text-blue-400" />
              Код вставки через iFrame (Рекомендуемый):
            </span>
            <button
              type="button"
              onClick={() => handleCopy(iframeSnippet, 'iframe')}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors flex items-center gap-1 text-[11px] font-bold border border-slate-700"
            >
              {copiedKind === 'iframe' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Скопировано!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Скопировать HTML</span>
                </>
              )}
            </button>
          </div>
          <pre className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-blue-300 text-xs font-mono overflow-x-auto leading-relaxed select-all">
            {iframeSnippet}
          </pre>
        </div>

        {/* Code Snippet Box 2: Script Loader */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between text-xs text-slate-300 font-semibold font-sans">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              JS-скрипт загрузки виджета на страницу:
            </span>
            <button
              type="button"
              onClick={() => handleCopy(scriptSnippet, 'script')}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors flex items-center gap-1 text-[11px] font-bold border border-slate-700"
            >
              {copiedKind === 'script' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Скопировано!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Скопировать JS</span>
                </>
              )}
            </button>
          </div>
          <pre className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-amber-300 text-xs font-mono overflow-x-auto leading-relaxed select-all">
            {scriptSnippet}
          </pre>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { 
  FileText, 
  Calendar, 
  Plus, 
  Trash2, 
  Copy, 
  Check, 
  AlertCircle, 
  ShieldCheck, 
  Clock, 
  Phone, 
  Wrench, 
  Sparkles,
  Edit3,
  Coins,
  Tag
} from 'lucide-react';
import { 
  InstallationActSettings, 
  ExtraWorksTariffVersion, 
  ExtraWorkItem 
} from '../types';
import { DEFAULT_INSTALLATION_ACT_SETTINGS } from '../utils/installationActUtils';

interface InstallationActSettingsTabProps {
  actSettings?: InstallationActSettings;
  onChange: (updated: InstallationActSettings) => void;
}

export const InstallationActSettingsTab: React.FC<InstallationActSettingsTabProps> = ({
  actSettings,
  onChange
}) => {
  const settings: InstallationActSettings = actSettings || DEFAULT_INSTALLATION_ACT_SETTINGS;

  const tariffVersions = settings.tariffVersions && settings.tariffVersions.length > 0 
    ? settings.tariffVersions 
    : DEFAULT_INSTALLATION_ACT_SETTINGS.tariffVersions;

  const [selectedTariffId, setSelectedTariffId] = useState<string>(() => tariffVersions[0]?.id || 'tariff-1');
  const [showAddVersionModal, setShowAddVersionModal] = useState(false);
  const [newVersionName, setNewVersionName] = useState('');
  const [newVersionEffectiveFrom, setNewVersionEffectiveFrom] = useState(new Date().toISOString().split('T')[0]);

  const activeTariff = tariffVersions.find(v => v.id === selectedTariffId) || tariffVersions[0];

  const handleUpdateField = <K extends keyof InstallationActSettings>(
    field: K, 
    value: InstallationActSettings[K]
  ) => {
    onChange({
      ...settings,
      [field]: value
    });
  };

  const handleUpdateTariffVersions = (newVersions: ExtraWorksTariffVersion[]) => {
    onChange({
      ...settings,
      tariffVersions: newVersions
    });
  };

  const handleAddVersion = () => {
    if (!newVersionName.trim() || !newVersionEffectiveFrom) return;

    const newId = `tariff-${Date.now()}`;
    const clonedItems: ExtraWorkItem[] = activeTariff 
      ? activeTariff.items.map(i => ({ ...i, id: `ew-${Date.now()}-${Math.random().toString(36).substr(2, 4)}` })) 
      : [];

    const newVersion: ExtraWorksTariffVersion = {
      id: newId,
      versionName: newVersionName.trim(),
      effectiveFrom: newVersionEffectiveFrom,
      items: clonedItems
    };

    const updatedVersions = [...tariffVersions, newVersion].sort((a, b) => 
      a.effectiveFrom.localeCompare(b.effectiveFrom)
    );

    handleUpdateTariffVersions(updatedVersions);
    setSelectedTariffId(newId);
    setShowAddVersionModal(false);
    setNewVersionName('');
  };

  const handleDeleteVersion = (versionId: string) => {
    if (tariffVersions.length <= 1) return;
    const filtered = tariffVersions.filter(v => v.id !== versionId);
    handleUpdateTariffVersions(filtered);
    if (selectedTariffId === versionId) {
      setSelectedTariffId(filtered[0].id);
    }
  };

  const handleAddWorkItem = () => {
    if (!activeTariff) return;

    const newItem: ExtraWorkItem = {
      id: `ew-${Date.now()}`,
      name: 'Новая дополнительная работа',
      unit: 'шт',
      price: 1000
    };

    const updatedTariffs = tariffVersions.map(v => {
      if (v.id === activeTariff.id) {
        return {
          ...v,
          items: [...v.items, newItem]
        };
      }
      return v;
    });

    handleUpdateTariffVersions(updatedTariffs);
  };

  const handleUpdateWorkItem = (itemId: string, field: keyof ExtraWorkItem, value: any) => {
    if (!activeTariff) return;

    const updatedTariffs = tariffVersions.map(v => {
      if (v.id === activeTariff.id) {
        return {
          ...v,
          items: v.items.map(item => item.id === itemId ? { ...item, [field]: value } : item)
        };
      }
      return v;
    });

    handleUpdateTariffVersions(updatedTariffs);
  };

  const handleDeleteWorkItem = (itemId: string) => {
    if (!activeTariff) return;

    const updatedTariffs = tariffVersions.map(v => {
      if (v.id === activeTariff.id) {
        return {
          ...v,
          items: v.items.filter(item => item.id !== itemId)
        };
      }
      return v;
    });

    handleUpdateTariffVersions(updatedTariffs);
  };

  const insertPlaceholder = (targetField: 'actTextIntro' | 'actTermsText', placeholder: string) => {
    const currentVal = settings[targetField] || '';
    handleUpdateField(targetField, `${currentVal} ${placeholder}`);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Overview Banner */}
      <div className="p-5 bg-gradient-to-r from-blue-900 to-indigo-900 rounded-3xl text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-blue-300 uppercase tracking-wider">
            <Wrench className="w-4 h-4 text-cyan-400" />
            <span>Конфигурация сдачи монтажа и прейскурантов</span>
          </div>
          <h3 className="text-lg font-black text-white">
            Акт приема-передачи и версионируемые Дополнительные работы
          </h3>
          <p className="text-xs text-blue-100 max-w-3xl leading-relaxed">
            Здесь настраиваются шаблоны печатного Акта, гарантийные обязательства компании и версионированные прайс-листы доп. работ. Система автоматически привязывает верный прайс-лист на дату заключения договора, даже если монтаж проводится спустя месяцы.
          </p>
        </div>
      </div>

      {/* 1. General Act Settings & Warranty */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-5">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
          <ShieldCheck className="w-5 h-5 text-emerald-600" />
          <div>
            <h4 className="font-black text-slate-900 text-sm">
              Гарантийные обязательства и контакты
            </h4>
            <div className="text-xs text-slate-500">
              Настройки гарантии на мебель и телефон сервисной поддержки для Акта
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Гарантия на мебель (в годах):
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                max="10"
                value={settings.warrantyYears || 2}
                onChange={(e) => handleUpdateField('warrantyYears', parseInt(e.target.value) || 2)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 font-bold text-xs text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">
                года / лет
              </span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              Отсчет начинается автоматически с даты подписания Акта сборщиком и клиентом (+{settings.warrantyYears || 2} года).
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Телефон сервисной службы (в Акт):
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="+7 (800) 555-35-35"
                value={settings.servicePhone || ''}
                onChange={(e) => handleUpdateField('servicePhone', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 font-bold text-xs text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 pl-9"
              />
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              Отображается в гарантийном блоке для обращения клиентов.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Act Template Configuration */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-5">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
          <FileText className="w-5 h-5 text-blue-600" />
          <div>
            <h4 className="font-black text-slate-900 text-sm">
              Шаблон текста Акта приема-передачи
            </h4>
            <div className="text-xs text-slate-500">
              Формулировки преамбулы и гарантийных условий, подставляемые при сдаче работ
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Заголовок документа:
          </label>
          <input
            type="text"
            value={settings.actHeaderTitle || ''}
            onChange={(e) => handleUpdateField('actHeaderTitle', e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 font-bold text-xs text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Intro Text */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-700">
              Текст преамбулы / вступления:
            </label>
            <div className="text-[10px] font-bold text-slate-400">
              Доступные переменные (нажмите чтобы добавить):
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 pb-1">
            {[
              { tag: '{orderNumber}', label: '№ Заказа' },
              { tag: '{clientName}', label: 'Клиент' },
              { tag: '{installerName}', label: 'Сборщик' },
              { tag: '{date}', label: 'Дата' },
              { tag: '{address}', label: 'Адрес' },
              { tag: '{companyName}', label: 'Компания' }
            ].map(item => (
              <button
                key={item.tag}
                type="button"
                onClick={() => insertPlaceholder('actTextIntro', item.tag)}
                className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-mono text-[10px] font-bold transition-colors cursor-pointer border border-slate-200"
              >
                + {item.tag}
              </button>
            ))}
          </div>

          <textarea
            rows={3}
            value={settings.actTextIntro || ''}
            onChange={(e) => handleUpdateField('actTextIntro', e.target.value)}
            className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed font-sans"
          />
        </div>

        {/* Terms Text */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-700">
              Текст условий приема и гарантийного обязательства:
            </label>
            <div className="text-[10px] font-bold text-slate-400">
              Переменные:
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 pb-1">
            {[
              { tag: '{warrantyYears}', label: 'Срок гарантии (лет)' },
              { tag: '{warrantyUntil}', label: 'Дата окончания гарантии' },
              { tag: '{servicePhone}', label: 'Тел. сервиса' },
              { tag: '{assemblyPrice}', label: 'Сумма сборки' },
              { tag: '{extraWorksTotal}', label: 'Сумма доп. работ' },
              { tag: '{grandTotal}', label: 'Итоговая сумма' }
            ].map(item => (
              <button
                key={item.tag}
                type="button"
                onClick={() => insertPlaceholder('actTermsText', item.tag)}
                className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 font-mono text-[10px] font-bold transition-colors cursor-pointer border border-slate-200"
              >
                + {item.tag}
              </button>
            ))}
          </div>

          <textarea
            rows={4}
            value={settings.actTermsText || ''}
            onChange={(e) => handleUpdateField('actTermsText', e.target.value)}
            className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed font-sans"
          />
        </div>
      </div>

      {/* 3. Versioned Extra Works Price Lists */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <Coins className="w-5 h-5 text-amber-600" />
            <div>
              <h4 className="font-black text-slate-900 text-sm">
                Версионируемые прайс-листы дополнительных работ
              </h4>
              <div className="text-xs text-slate-500">
                Каждая версия имеет дату вступления в силу. Сборщик видит цены согласно дате договора с клиентом.
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowAddVersionModal(true)}
            className="px-4 py-2 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Новая версия прайса</span>
          </button>
        </div>

        {/* Version Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-100">
          {tariffVersions.map(tariff => {
            const isSelected = tariff.id === selectedTariffId;
            return (
              <button
                key={tariff.id}
                type="button"
                onClick={() => setSelectedTariffId(tariff.id)}
                className={`px-4 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <Calendar className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-400' : 'text-slate-400'}`} />
                <span>{tariff.versionName}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-lg ${isSelected ? 'bg-slate-800 text-amber-300' : 'bg-slate-200 text-slate-600'}`}>
                  с {tariff.effectiveFrom}
                </span>
              </button>
            );
          })}
        </div>

        {/* Active Tariff Details */}
        {activeTariff && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <div className="flex items-center gap-3">
                <Tag className="w-4 h-4 text-amber-600" />
                <div>
                  <div className="font-bold text-xs text-slate-900">
                    {activeTariff.versionName} (Действует с {activeTariff.effectiveFrom})
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Позиций в прайс-листе: {activeTariff.items.length} шт.
                  </div>
                </div>
              </div>

              {tariffVersions.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleDeleteVersion(activeTariff.id)}
                  className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Удалить версию</span>
                </button>
              )}
            </div>

            {/* Price Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs text-slate-800">
                <thead className="bg-slate-100 text-[11px] font-black uppercase tracking-wider text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="p-3">№</th>
                    <th className="p-3">Наименование услуги / доп. работы</th>
                    <th className="p-3 w-32">Ед. изм.</th>
                    <th className="p-3 w-40">Цена (₽)</th>
                    <th className="p-3 w-16 text-right">Действие</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeTariff.items.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 font-mono text-slate-400 font-bold">
                        {idx + 1}
                      </td>

                      <td className="p-3">
                        <input
                          type="text"
                          value={item.name || ""}
                          onChange={(e) => handleUpdateWorkItem(item.id, 'name', e.target.value)}
                          className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </td>

                      <td className="p-3">
                        <select
                          value={item.unit || "шт"}
                          onChange={(e) => handleUpdateWorkItem(item.id, 'unit', e.target.value)}
                          className="w-full px-2 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 outline-none cursor-pointer"
                        >
                          <option value="шт">шт</option>
                          <option value="м.п.">м.п.</option>
                          <option value="услуга">услуга</option>
                          <option value="этаж">этаж</option>
                          <option value="компл">компл</option>
                        </select>
                      </td>

                      <td className="p-3">
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            step="50"
                            value={item.price ?? 0}
                            onChange={(e) => handleUpdateWorkItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-mono font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500 pr-7"
                          />
                          <span className="absolute right-2.5 top-1.5 font-bold text-slate-400 text-xs">
                            ₽
                          </span>
                        </div>
                      </td>

                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteWorkItem(item.id)}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                          title="Удалить позицию"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}

                  {activeTariff.items.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-slate-400 font-medium text-xs">
                        Прайс-лист пока пуст. Нажмите «Добавить позицию», чтобы внести работы.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-start">
              <button
                type="button"
                onClick={handleAddWorkItem}
                className="px-4 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4 text-amber-600" />
                <span>Добавить позицию в прайс-лист</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal to Add New Tariff Version */}
      {showAddVersionModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-black text-slate-900 text-base">
                Создать новую версию прайс-листа
              </h3>
              <button
                type="button"
                onClick={() => setShowAddVersionModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-snug">
              При создании новой версии все работы текущего прайс-листа автоматически скопируются, и вы сможете изменить их стоимости.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Название версии:
              </label>
              <input
                type="text"
                placeholder="например: Прайс-лист от 01.10.2026"
                value={newVersionName}
                onChange={(e) => setNewVersionName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Дата вступления в силу:
              </label>
              <input
                type="date"
                value={newVersionEffectiveFrom}
                onChange={(e) => setNewVersionEffectiveFrom(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAddVersionModal(false)}
                className="px-4 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleAddVersion}
                className="px-5 py-2 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md"
              >
                Создать версию
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

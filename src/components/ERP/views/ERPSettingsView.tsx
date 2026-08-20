import React, { useState } from 'react';
import { 
  Settings, 
  Factory, 
  Layers, 
  Scissors, 
  Save, 
  CheckCircle2, 
  Plus, 
  Trash2, 
  ShieldCheck,
  Table,
  RotateCcw,
  Info,
  Printer,
  QrCode,
  Package
} from 'lucide-react';
import { ERPCompanySettings, MachineEquipment, PackageLabelSettings } from '../types';
import { DEFAULT_BIRKA_COLUMN_MAPPING } from '../utils/birkaParser';

interface ERPSettingsViewProps {
  settings: ERPCompanySettings;
  onSaveSettings: (settings: ERPCompanySettings) => void;
}

const DEFAULT_EQUIPMENT_LIST: MachineEquipment[] = [
  { id: 'eq-1', department: 'cutting', name: 'Форматно-раскроечный Altendorf F45', status: 'working' },
  { id: 'eq-2', department: 'edging', name: 'Кромкооблицовочный станок Brandt KTD 720', status: 'working' },
  { id: 'eq-3', department: 'cnc', name: 'Обрабатывающий центр ЧПУ Homag Centateq', status: 'working' }
];

const BIRKA_PARAM_DESCRIPTIONS: { key: string; label: string; erpTarget: string; desc: string; icon: string }[] = [
  { 
    key: 'pos', 
    label: '№ детали / Позиция', 
    erpTarget: 'Порядковый номер бирки детали (Part Position)', 
    desc: 'Уникальный номер или позиция детали на карте раскроя. Используется для штрихкодирования и печати индивидуальных этикеток.',
    icon: '🏷️' 
  },
  { 
    key: 'name', 
    label: 'Наименование детали', 
    erpTarget: 'Название элемента (Part Name)', 
    desc: 'Название детали (например, "Боковина левая", "Полка съемная", "Фасад"). Отображается на бирках и во всех производственных листах.',
    icon: '📝' 
  },
  { 
    key: 'orderNumber', 
    label: 'Номер заказа / Сделка', 
    erpTarget: 'Привязка к заказу (Order Number)', 
    desc: 'Идентификатор проекта или номер заказа. Позволяет автоматически привязать детали к сделке в ERP.',
    icon: '📦' 
  },
  { 
    key: 'length', 
    label: 'Длина детали (L, мм)', 
    erpTarget: 'Габарит длины по оси X (Length)', 
    desc: 'Длина детали в миллиметрах (вдоль текстуры или основной оси). Участвует в расчете чистой площади и сметы раскроя.',
    icon: '📏' 
  },
  { 
    key: 'width', 
    label: 'Ширина детали (W, мм)', 
    erpTarget: 'Габарит ширины по оси Y (Width)', 
    desc: 'Ширина детали в миллиметрах (поперек текстуры). Участвует в расчете площади раскроя.',
    icon: '📐' 
  },
  { 
    key: 'thickness', 
    label: 'Толщина (T, мм)', 
    erpTarget: 'Толщина плиты (Thickness)', 
    desc: 'Толщина материала (16, 18, 22, 25 мм и т.д.). Определяет применяемую плиту и сверление.',
    icon: '🧱' 
  },
  { 
    key: 'material', 
    label: 'Материал / Плита', 
    erpTarget: 'Декор и материал (Material Sheet)', 
    desc: 'Наименование или артикул ЛДСП/МДФ (например, "Egger Дуб Галифакс 16мм"). Группирует детали по пачкам раскроя.',
    icon: '🪵' 
  },
  { 
    key: 'quantity', 
    label: 'Количество (шт.)', 
    erpTarget: 'Количество деталей (Quantity)', 
    desc: 'Число одинаковых деталей в заказе. Умножает площадь и погонаж кромки.',
    icon: '🔢' 
  },
  { 
    key: 'edgeL1', 
    label: 'Кромка Длина 1 (L1)', 
    erpTarget: 'Облицовка первой стороны длины', 
    desc: 'Тип/толщина кромки или артикул по стороне L1 (например, "ПВХ 2.0 Дуб").',
    icon: '✂️' 
  },
  { 
    key: 'edgeL2', 
    label: 'Кромка Длина 2 (L2)', 
    erpTarget: 'Облицовка второй стороны длины', 
    desc: 'Кромка по противоположной стороне длины L2.',
    icon: '✂️' 
  },
  { 
    key: 'edgeW1', 
    label: 'Кромка Ширина 1 (W1)', 
    erpTarget: 'Облицовка первой стороны ширины', 
    desc: 'Кромка по первой торцевой стороне W1.',
    icon: '✂️' 
  },
  { 
    key: 'edgeW2', 
    label: 'Кромка Ширина 2 (W2)', 
    erpTarget: 'Облицовка второй стороны ширины', 
    desc: 'Кромка по второй торцевой стороне W2.',
    icon: '✂️' 
  },
  { 
    key: 'notes', 
    label: 'Примечания / Пазы / ЧПУ', 
    erpTarget: 'Технологические операции (Notes / CNC)', 
    desc: 'Служебная информация: наличие паза под ДВП, присадка петель, евровинтов, ЧПУ-обработка, радиусы.',
    icon: '⚙️' 
  },
  { 
    key: 'barcode', 
    label: 'Штрихкод / QR-код', 
    erpTarget: 'Код для сканера на участках (Barcode)', 
    desc: 'Специфический номер штрихкода из раскроечной программы для сканирования деталей на станках.',
    icon: '🏁' 
  }
];

export const ERPSettingsView: React.FC<ERPSettingsViewProps> = ({
  settings,
  onSaveSettings
}) => {
  const [formData, setFormData] = useState<ERPCompanySettings>(() => ({
    ...settings,
    equipmentList: (settings.equipmentList && settings.equipmentList.length > 0) 
      ? settings.equipmentList 
      : DEFAULT_EQUIPMENT_LIST,
    birkaColumnMapping: settings.birkaColumnMapping || DEFAULT_BIRKA_COLUMN_MAPPING,
    birkaEncodingPreference: settings.birkaEncodingPreference || 'auto'
  }));

  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onSaveSettings(formData);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handleUpdateEquipment = (index: number, field: keyof MachineEquipment, value: any) => {
    const list = [...(formData.equipmentList || DEFAULT_EQUIPMENT_LIST)];
    if (!list[index]) return;
    list[index] = { ...list[index], [field]: value };
    setFormData({ ...formData, equipmentList: list });
  };

  const handleRemoveEquipment = (index: number) => {
    const list = (formData.equipmentList || DEFAULT_EQUIPMENT_LIST).filter((_, i) => i !== index);
    setFormData({ ...formData, equipmentList: list });
  };

  const handleAddEquipment = () => {
    const current = formData.equipmentList || DEFAULT_EQUIPMENT_LIST;
    const newEq: MachineEquipment = {
      id: `eq-${Date.now()}`,
      department: 'cutting',
      name: 'Новый станок / Оборудование',
      status: 'working'
    };
    setFormData({ ...formData, equipmentList: [...current, newEq] });
  };

  const handleUpdateBirkaMapping = (paramKey: string, rawText: string) => {
    const aliases = rawText
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    
    setFormData(prev => ({
      ...prev,
      birkaColumnMapping: {
        ...(prev.birkaColumnMapping || DEFAULT_BIRKA_COLUMN_MAPPING),
        [paramKey]: aliases
      }
    }));
  };

  const handleResetBirkaMapping = () => {
    setFormData(prev => ({
      ...prev,
      birkaColumnMapping: { ...DEFAULT_BIRKA_COLUMN_MAPPING }
    }));
  };

  const applyPreset = (preset: 'basis' | 'bcad' | 'k3' | 'excel') => {
    let mapping: Record<string, string[]> = { ...DEFAULT_BIRKA_COLUMN_MAPPING };
    if (preset === 'basis') {
      mapping = {
        pos: ['№ дет', 'позиция', 'поз', '№ бирки', 'бирк', 'код дет', 'item_no', 'label'],
        name: ['наименование', 'название', 'наим', 'деталь', 'панель'],
        orderNumber: ['заказ', 'сделка', 'проект', 'order'],
        length: ['длина', 'length', 'l', 'размер x', 'l, мм'],
        width: ['ширина', 'width', 'w', 'размер y', 'w, мм'],
        thickness: ['толщина', 'thick', 't', 'толщ', 'толщина, мм'],
        material: ['материал', 'плита', 'лдсп', 'мдф', 'material'],
        quantity: ['количество', 'кол', 'кол-во', 'qty', 'шт'],
        edgeL1: ['кромка л1', 'кромка l1', 'кромка1', 'длина 1', 'l1'],
        edgeL2: ['кромка л2', 'кромка l2', 'кромка2', 'длина 2', 'l2'],
        edgeW1: ['кромка ш1', 'кромка w1', 'кромка3', 'ширина 1', 'w1'],
        edgeW2: ['кромка ш2', 'кромка w2', 'кромка4', 'ширина 2', 'w2'],
        notes: ['примечание', 'паз', 'присадка', 'чпу', 'обработка', 'note'],
        barcode: ['штрихкод', 'barcode', 'qr', 'код']
      };
    } else if (preset === 'bcad') {
      mapping = {
        pos: ['id', 'номер', 'поз', '№'],
        name: ['наименование', 'имя детали', 'деталь', 'элемент'],
        orderNumber: ['проект', 'заказ', 'изделие'],
        length: ['длина (x)', 'длина', 'x', 'габарит x'],
        width: ['ширина (y)', 'ширина', 'y', 'габарит y'],
        thickness: ['толщина (z)', 'толщина', 'z', 'толщ'],
        material: ['материал', 'тип плиты'],
        quantity: ['кол-во', 'количество', 'шт'],
        edgeL1: ['кромка x1', 'кромка 1', 'l1'],
        edgeL2: ['кромка x2', 'кромка 2', 'l2'],
        edgeW1: ['кромка y1', 'кромка 3', 'w1'],
        edgeW2: ['кромка y2', 'кромка 4', 'w2'],
        notes: ['комментарий', 'инфо', 'присадка'],
        barcode: ['штрих-код', 'код']
      };
    }
    setFormData(prev => ({ ...prev, birkaColumnMapping: mapping }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
            <Settings className="w-4 h-4 text-blue-600" /> Конфигурация цеха и импорта
          </div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900">
            Настройки ERP системы производства
          </h2>
        </div>

        <button
          onClick={() => handleSave()}
          className="px-6 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-200 transition-all flex items-center gap-2 cursor-pointer self-start md:self-auto"
        >
          {isSaved ? <CheckCircle2 className="w-4 h-4 text-emerald-300" /> : <Save className="w-4 h-4" />}
          {isSaved ? 'Сохранено!' : 'Сохранить настройки'}
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* SECTION: Birka Parser Column Mapping & Parameters */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Table className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  Параметры анализа и столбцы файла бирок (.BIR / CSV / TSV / TXT)
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Настройте соответствие колонок из вашей программы раскроя (Базис, bCAD, К3-Мебель, Excel) полям учета в ERP.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => applyPreset('basis')}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition-colors"
                title="Применить готовый шаблон для Базис-Мебельщик"
              >
                Базис
              </button>
              <button
                type="button"
                onClick={() => applyPreset('bcad')}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition-colors"
                title="Применить готовый шаблон для bCAD"
              >
                bCAD
              </button>
              <button
                type="button"
                onClick={handleResetBirkaMapping}
                className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px] flex items-center gap-1 transition-colors"
                title="Сбросить все синонимы на исходные"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Сброс
              </button>
            </div>
          </div>

          <div className="p-4 bg-indigo-50/70 rounded-2xl border border-indigo-100 flex items-start gap-3 text-xs text-indigo-950">
            <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>Как работает автоопределение:</strong> При загрузке файла система ищет совпадения заголовков столбцов с любым из указанных синонимов (через запятую, регистр не важен). Вы можете дописать любое название колонки из вашего файла, чтобы ERP точно распознала его.
            </div>
          </div>

          {/* Encoding Preference */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-slate-800">Кодировка входящих файлов</div>
              <div className="text-[11px] text-slate-500">Автоопределение поддерживает Windows-1251, UTF-8 и DOS CP866</div>
            </div>
            <select
              value={formData.birkaEncodingPreference || 'auto'}
              onChange={(e) => setFormData({ ...formData, birkaEncodingPreference: e.target.value as any })}
              className="px-3 py-2 rounded-xl bg-white border border-slate-200 font-bold text-slate-800 text-xs focus:ring-2 focus:ring-blue-500 outline-none w-full sm:w-56"
            >
              <option value="auto">✨ Автоопределение (рекомендуется)</option>
              <option value="windows-1251">Windows-1251 (ANSI Базис)</option>
              <option value="utf-8">UTF-8 (Юникод)</option>
              <option value="cp866">CP866 (DOS / ЧПУ)</option>
            </select>
          </div>

          {/* Parameters Mapping Grid */}
          <div className="space-y-3">
            {BIRKA_PARAM_DESCRIPTIONS.map((param) => {
              const currentAliases = (formData.birkaColumnMapping && formData.birkaColumnMapping[param.key]) 
                ? formData.birkaColumnMapping[param.key]
                : (DEFAULT_BIRKA_COLUMN_MAPPING[param.key] || []);

              return (
                <div 
                  key={param.key} 
                  className="p-4 bg-slate-50/90 rounded-2xl border border-slate-200 hover:border-slate-300 transition-colors"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
                    <div className="lg:w-1/3">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{param.icon}</span>
                        <span className="font-bold text-xs text-slate-900">{param.label}</span>
                      </div>
                      <div className="text-[11px] font-semibold text-blue-700 mt-1">
                        Куда в ERP: {param.erpTarget}
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1 leading-normal">
                        {param.desc}
                      </p>
                    </div>

                    <div className="lg:flex-1 space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-600 uppercase">
                        Распознаваемые имена колонок в файле (через запятую)
                      </label>
                      <input
                        type="text"
                        value={currentAliases.join(', ')}
                        onChange={(e) => handleUpdateBirkaMapping(param.key, e.target.value)}
                        placeholder="Например: наименование, название, деталь"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 font-mono text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                      <div className="flex flex-wrap gap-1 mt-1">
                        {currentAliases.map((alias, aIdx) => (
                          <span 
                            key={aIdx}
                            className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 font-mono text-[10px]"
                          >
                            {alias}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Additional Works Settings Section */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
          <h3 className="font-bold text-slate-900 text-base mb-1">Дополнительные производственные работы</h3>
          <p className="text-xs text-slate-400 mb-4">Настройка отображения блока специфических работ (столешница, стеновая панель, нарезка штанги/трубы, нарезка цоколя) при загрузке спецификации бирок</p>

          <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200 cursor-pointer hover:bg-slate-100/80 transition-colors">
            <input
              type="checkbox"
              checked={formData.showAdditionalWorksOnUpload ?? true}
              onChange={(e) => setFormData({ ...formData, showAdditionalWorksOnUpload: e.target.checked })}
              className="w-5 h-5 rounded-lg border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <div>
              <div className="font-bold text-xs text-slate-900">
                Показывать блок "Дополнительные работы" в планировании и при загрузке бирок
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Позволяет технологу при подгрузке `.bir` сразу отмечать распил/кромление/радиус столешницы, распил стеновой панели, нарезку штанги и цоколя.
              </div>
            </div>
          </label>
        </div>

        {/* Piecework Tariffs Section */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
          <h3 className="font-bold text-slate-900 text-base mb-1">Тарифы сдельной выработки мастеров</h3>
          <p className="text-xs text-slate-400 mb-6">Расценки за операции для автоматического расчета зарплат</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-2">
                <Scissors className="w-4 h-4 text-blue-600" />
                Распил ЛДСП (₽ за м²)
              </label>
              <input
                type="number"
                value={formData.cuttingRatePerM2 || 65}
                onChange={(e) => setFormData({ ...formData, cuttingRatePerM2: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 font-black text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                Кромкооблицовка (₽ за п.м.)
              </label>
              <input
                type="number"
                value={formData.edgingRatePerM || 35}
                onChange={(e) => setFormData({ ...formData, edgingRatePerM: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 font-black text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-2">
                <Factory className="w-4 h-4 text-purple-600" />
                ЧПУ / Присадка (₽ за отверстие)
              </label>
              <input
                type="number"
                value={formData.cncHoleRate || 12}
                onChange={(e) => setFormData({ ...formData, cncHoleRate: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 font-black text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-2">
                <Factory className="w-4 h-4 text-emerald-600" />
                Сборка модуля (₽ за шт.)
              </label>
              <input
                type="number"
                value={formData.assemblyModuleRate || 250}
                onChange={(e) => setFormData({ ...formData, assemblyModuleRate: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 font-black text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                ОТК / Упаковка (₽ за заказ)
              </label>
              <input
                type="number"
                value={formData.qcRatePerOrder || 300}
                onChange={(e) => setFormData({ ...formData, qcRatePerOrder: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 font-black text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Target Production & Equipment Section */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-6">
          <div>
            <h3 className="font-bold text-slate-900 text-base mb-1">Плановые объемы выработки и оборудование</h3>
            <p className="text-xs text-slate-400">
              Целевые показатели цеха за месяц и станочный парк для формирования сводных аналитических отчетов
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-2">
                <Scissors className="w-4 h-4 text-blue-600" />
                План выработки ЛДСП (м²/месяц)
              </label>
              <input
                type="number"
                value={formData.targetMonthlyM2 ?? 1000}
                onChange={(e) => setFormData({ ...formData, targetMonthlyM2: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 font-black text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                План кромкооблицовки (п.м./месяц)
              </label>
              <input
                type="number"
                value={formData.targetMonthlyEdgeM ?? 5000}
                onChange={(e) => setFormData({ ...formData, targetMonthlyEdgeM: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 font-black text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-2">
                <Factory className="w-4 h-4 text-purple-600" />
                План изготовления деталей (шт./месяц)
              </label>
              <input
                type="number"
                value={formData.targetMonthlyParts ?? 3000}
                onChange={(e) => setFormData({ ...formData, targetMonthlyParts: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 font-black text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider">Оборудование цеха (Станки)</h4>
              <button
                type="button"
                onClick={handleAddEquipment}
                className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Добавить станок
              </button>
            </div>

            <div className="space-y-3">
              {(formData.equipmentList || DEFAULT_EQUIPMENT_LIST).map((eq, eIdx) => (
                <div key={eq.id || `eq-${eIdx}`} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col md:flex-row items-center gap-3">
                  <div className="w-full md:w-1/4">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Участок</label>
                    <select
                      value={eq.department}
                      onChange={(e) => handleUpdateEquipment(eIdx, 'department', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 font-bold text-slate-900 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="cutting">Раскрой (ЛДСП)</option>
                      <option value="edging">Кромкооблицовка</option>
                      <option value="cnc">Присадка и ЧПУ</option>
                      <option value="facades">Фасады</option>
                      <option value="assembly">Сборка</option>
                    </select>
                  </div>

                  <div className="w-full md:flex-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Модель и марка оборудования</label>
                    <input
                      type="text"
                      value={eq.name || ''}
                      onChange={(e) => handleUpdateEquipment(eIdx, 'name', e.target.value)}
                      placeholder="Например: Форматно-раскроечный Altendorf F45"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 font-bold text-slate-900 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div className="w-full md:w-36">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Статус</label>
                    <select
                      value={eq.status}
                      onChange={(e) => handleUpdateEquipment(eIdx, 'status', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 font-bold text-slate-900 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="working">Работает</option>
                      <option value="maintenance">Обслуживание</option>
                      <option value="idle">Простой</option>
                      <option value="broken">В ремонте</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveEquipment(eIdx)}
                    className="self-end md:self-center p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 transition-colors cursor-pointer mt-2 md:mt-4"
                    title="Удалить оборудование"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Package Thermal Labels Settings & Live Preview */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-orange-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  Настройки термоэтикеток упаковок и мест (QR-код и печать)
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Конфигурация размера термонаклейки (по умолчанию 120×75 мм), состава полей и масштаба шрифта для термопринтера.
              </p>
            </div>

            {/* Quick Size Presets */}
            <div className="flex items-center gap-2 flex-wrap">
              {[
                { label: '120×75 мм (стандарт)', w: 120, h: 75 },
                { label: '100×60 мм', w: 100, h: 60 },
                { label: '100×70 мм', w: 100, h: 70 },
                { label: '58×40 мм', w: 58, h: 40 }
              ].map(preset => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    const current = formData.packageLabelSettings || { widthMm: 120, heightMm: 75 };
                    setFormData({
                      ...formData,
                      packageLabelSettings: {
                        ...current,
                        widthMm: preset.w,
                        heightMm: preset.h
                      }
                    });
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-orange-50 hover:text-orange-900 text-slate-700 font-bold text-[11px] transition-colors cursor-pointer"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Dimensions & Toggles */}
            <div className="lg:col-span-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Ширина этикетки (мм)
                  </label>
                  <input
                    type="number"
                    value={formData.packageLabelSettings?.widthMm || 120}
                    onChange={(e) => {
                      const current = formData.packageLabelSettings || { widthMm: 120, heightMm: 75 };
                      setFormData({
                        ...formData,
                        packageLabelSettings: {
                          ...current,
                          widthMm: Number(e.target.value) || 120
                        }
                      });
                    }}
                    className="w-full px-3 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 font-mono font-bold text-slate-900 text-xs focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Высота этикетки (мм)
                  </label>
                  <input
                    type="number"
                    value={formData.packageLabelSettings?.heightMm || 75}
                    onChange={(e) => {
                      const current = formData.packageLabelSettings || { widthMm: 120, heightMm: 75 };
                      setFormData({
                        ...formData,
                        packageLabelSettings: {
                          ...current,
                          heightMm: Number(e.target.value) || 75
                        }
                      });
                    }}
                    className="w-full px-3 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 font-mono font-bold text-slate-900 text-xs focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-3 pt-2">
                <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.packageLabelSettings?.showDetailsList !== false}
                    onChange={(e) => {
                      const current = formData.packageLabelSettings || { widthMm: 120, heightMm: 75 };
                      setFormData({
                        ...formData,
                        packageLabelSettings: {
                          ...current,
                          showDetailsList: e.target.checked
                        }
                      });
                    }}
                    className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-900">Печатать перечень вложенных деталей</div>
                    <div className="text-[11px] text-slate-500">Показывает номера позиций и размеры деталей внутри места</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.packageLabelSettings?.showOrderQr !== false}
                    onChange={(e) => {
                      const current = formData.packageLabelSettings || { widthMm: 120, heightMm: 75 };
                      setFormData({
                        ...formData,
                        packageLabelSettings: {
                          ...current,
                          showOrderQr: e.target.checked
                        }
                      });
                    }}
                    className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-900">Печатать машиночитаемый QR-код</div>
                    <div className="text-[11px] text-slate-500">Позволяет сканировать коробку при отгрузке водителю</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.packageLabelSettings?.showEmployeeName !== false}
                    onChange={(e) => {
                      const current = formData.packageLabelSettings || { widthMm: 120, heightMm: 75 };
                      setFormData({
                        ...formData,
                        packageLabelSettings: {
                          ...current,
                          showEmployeeName: e.target.checked
                        }
                      });
                    }}
                    className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-900">Печатать ФИО упаковщика / мастера</div>
                    <div className="text-[11px] text-slate-500">Имя сотрудника, сформировавшего упаковку</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.packageLabelSettings?.showDateTime !== false}
                    onChange={(e) => {
                      const current = formData.packageLabelSettings || { widthMm: 120, heightMm: 75 };
                      setFormData({
                        ...formData,
                        packageLabelSettings: {
                          ...current,
                          showDateTime: e.target.checked
                        }
                      });
                    }}
                    className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-900">Печатать дату и время формирования</div>
                    <div className="text-[11px] text-slate-500">Точное время запечатывания места в цеху</div>
                  </div>
                </label>
              </div>
            </div>

            {/* Right Column: Live Mock Preview */}
            <div className="lg:col-span-6 flex flex-col items-center justify-center p-6 bg-slate-100/80 rounded-2xl border border-slate-200">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                Превью наклейки ({formData.packageLabelSettings?.widthMm || 120}×{formData.packageLabelSettings?.heightMm || 75} мм)
              </div>

              <div
                className="bg-white text-black p-3 rounded-lg border-2 border-black shadow-md flex flex-col justify-between select-none"
                style={{
                  width: `${(formData.packageLabelSettings?.widthMm || 120) * 2.8}px`,
                  minHeight: `${(formData.packageLabelSettings?.heightMm || 75) * 2.8}px`,
                  fontSize: '9.5px'
                }}
              >
                <div>
                  <div className="flex items-start justify-between border-b-2 border-black pb-1 mb-1">
                    <div>
                      <div className="text-[8px] font-mono font-black text-slate-700 uppercase">МЕБЕЛЬНОЕ ПРОИЗВОДСТВО</div>
                      <div className="text-xs font-black">ЗАКАЗ: 2026-084</div>
                      <div className="text-[8px] text-slate-600 truncate max-w-[150px]">Иванов И.И. • Кухня Премиум</div>
                    </div>
                    <div className="bg-black text-white px-1.5 py-0.5 rounded text-[10px] font-mono font-black">
                      МЕСТО 1 / 3
                    </div>
                  </div>

                  <div className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-300 mb-1">
                    <div className="text-[7.5px] font-bold text-slate-500 uppercase">Наименование:</div>
                    <div className="text-[9.5px] font-black text-black leading-tight">Место 1 (Корпус низ Дуб Вотан)</div>
                  </div>
                </div>

                <div className="flex items-stretch gap-1.5 py-1">
                  <div className="flex-1 min-w-0 pr-1">
                    {formData.packageLabelSettings?.showDetailsList !== false && (
                      <div className="space-y-0.5 text-[8px]">
                        <div className="font-bold border-b border-dotted pb-0.5">Вложенные детали (5 шт):</div>
                        <div>#1 Боковина левая 720×560</div>
                        <div>#2 Боковина правая 720×560</div>
                        <div>#3 Дно ящика 568×560</div>
                        <div className="text-slate-500 italic">+ еще 2 детали...</div>
                      </div>
                    )}
                  </div>

                  {formData.packageLabelSettings?.showOrderQr !== false && (
                    <div className="w-12 h-12 bg-slate-900 text-white flex flex-col items-center justify-center rounded text-[7px] font-mono shrink-0">
                      <QrCode className="w-8 h-8 text-white" />
                      <span>QR-код</span>
                    </div>
                  )}
                </div>

                <div className="border-t border-black pt-0.5 mt-1 flex items-center justify-between text-[7.5px]">
                  <div>
                    {formData.packageLabelSettings?.showEmployeeName !== false && (
                      <div>Упаковщик: <strong>Петров А.В.</strong></div>
                    )}
                    {formData.packageLabelSettings?.showDateTime !== false && (
                      <div className="text-slate-500">20.08.2026, 14:35</div>
                    )}
                  </div>
                  <div className="font-mono font-black text-[8px]">ERP-2026-084-M1</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Work Shifts & Timings */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
          <h3 className="font-bold text-slate-900 text-base mb-1">Режим работы и смены</h3>
          <p className="text-xs text-slate-400 mb-6">График сменности и нормативы времени</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Начало смены</label>
              <input
                type="time"
                value={formData.workDayStart || '08:00'}
                onChange={(e) => setFormData({ ...formData, workDayStart: e.target.value })}
                className="w-full px-3 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 font-bold text-slate-900 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Конец смены</label>
              <input
                type="time"
                value={formData.workDayEnd || '20:00'}
                onChange={(e) => setFormData({ ...formData, workDayEnd: e.target.value })}
                className="w-full px-3 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 font-bold text-slate-900 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Длительность смены (часов)</label>
              <input
                type="number"
                value={formData.defaultShiftDurationHours || 12}
                onChange={(e) => setFormData({ ...formData, defaultShiftDurationHours: Number(e.target.value) })}
                className="w-full px-3 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 font-bold text-slate-900 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

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
  Package,
  Wrench,
  Box,
  Truck,
  Check,
  Sliders,
  FileSpreadsheet,
  Coins,
  Clock,
  Briefcase,
  ToggleLeft,
  ToggleRight,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  ChevronUp,
  ChevronDown,
  Sparkles
} from 'lucide-react';
import { ERPCompanySettings, MachineEquipment, PackageLabelSettings, ProductionStageId, ERPNoteRule } from '../types';
import { DEFAULT_BIRKA_COLUMN_MAPPING } from '../utils/birkaParser';
import { DEFAULT_HARDWARE_COLUMN_MAPPING } from '../utils/hardwareParser';

interface ERPSettingsViewProps {
  settings: ERPCompanySettings;
  onSaveSettings: (settings: ERPCompanySettings) => void;
}

const ALL_STAGES_CONFIG: {
  id: ProductionStageId;
  name: string;
  defaultTitle: string;
  department: string;
  icon: any;
  color: string;
  badgeBg: string;
  description: string;
}[] = [
  { id: 'cutting', name: 'Раскрой (ЛДСП/МДФ)', defaultTitle: 'Участок раскроя (Форматно-раскроечный / ЧПУ)', department: 'cutting', icon: Scissors, color: 'text-blue-600', badgeBg: 'bg-blue-50 text-blue-700 border-blue-200', description: 'Распил плитных материалов (ЛДСП, МДФ, ХДФ, столешницы), нанесение штрихкодов и первичных бирок.' },
  { id: 'edging', name: 'Кромкооблицовка', defaultTitle: 'Участок кромкооблицовки (Кромка)', department: 'edging', icon: Layers, color: 'text-indigo-600', badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200', description: 'Облицовка кромок деталей (ПВХ 0.4, 1.0, 2.0 мм, ABS, PUR-клей), снятие свесов и полировка.' },
  { id: 'cnc', name: 'Присадка / ЧПУ', defaultTitle: 'Участок присадки и фрезеровки (ЧПУ)', department: 'cnc', icon: Factory, color: 'text-purple-600', badgeBg: 'bg-purple-50 text-purple-700 border-purple-200', description: 'Сверление монтажных отверстий под конфирматы, эксцентрики, петли, фрезеровка пазов и криволинейных деталей.' },
  { id: 'facades', name: 'Фасады и МДФ', defaultTitle: 'Фасадный участок / МДФ и покраска', department: 'facades', icon: Wrench, color: 'text-amber-600', badgeBg: 'bg-amber-50 text-amber-700 border-amber-200', description: 'Изготовление фасадов, фрезеровка 3D-профилей, мембранно-вакуумное прессование пленки ПВХ или покраска эмалью.' },
  { id: 'assembly', name: 'Сборка корпусов', defaultTitle: 'Участок контрольной сборки корпусов', department: 'assembly', icon: Wrench, color: 'text-teal-600', badgeBg: 'bg-teal-50 text-teal-700 border-teal-200', description: 'Предварительная или чистовая сборка корпусных модулей, установка фурнитуры, выдвижных ящиков и подгонка.' },
  { id: 'kitting', name: 'Комплектовка', defaultTitle: 'Участок комплектации фурнитуры и крепежа', department: 'kitting', icon: Box, color: 'text-cyan-600', badgeBg: 'bg-cyan-50 text-cyan-700 border-cyan-200', description: 'Комплектование петель, направляющих, ручек, опор, подъемников, крепежных пакетов под конкретный заказ.' },
  { id: 'qc', name: 'Контроль ОТК', defaultTitle: 'Участок контроля качества (ОТК)', department: 'qc', icon: ShieldCheck, color: 'text-emerald-600', badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200', description: 'Проверка геометрии, отсутствия сколов, соответствия чертежам и спецификации перед запечатыванием.' },
  { id: 'packing', name: 'Упаковка мест', defaultTitle: 'Участок упаковки мест и маркировки', department: 'packing', icon: Package, color: 'text-orange-600', badgeBg: 'bg-orange-50 text-orange-700 border-orange-200', description: 'Формирование упаковочных коробок/мест, укладка деталей, защитных уголков и печать термоэтикеток со штрихкодами.' },
  { id: 'shipping', name: 'Склад и отгрузка', defaultTitle: 'Склад готовой продукции и отгрузка', department: 'shipping', icon: Truck, color: 'text-sky-600', badgeBg: 'bg-sky-50 text-sky-700 border-sky-200', description: 'Адресное хранение готовых мест, сканирование при погрузке в автотранспорт водителя и оформление акта.' }
];

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
    desc: 'Например: "Боковина левая", "Фасад ящика верхний", "Полка съемная".',
    icon: '📋' 
  },
  { 
    key: 'orderNumber', 
    label: '№ Заказа / Сделки', 
    erpTarget: 'Номер заказа на бирке (Order Reference)', 
    desc: 'Номер проекта или заказа из договора для сверки соответствия файла.',
    icon: '🔖' 
  },
  { 
    key: 'length', 
    label: 'Длина (L, мм)', 
    erpTarget: 'Длина заготовки вдоль текстуры (Length)', 
    desc: 'Габаритный размер детали вдоль волокон древесного рисунка.',
    icon: '📏' 
  },
  { 
    key: 'width', 
    label: 'Ширина (W, мм)', 
    erpTarget: 'Ширина заготовки поперек текстуры (Width)', 
    desc: 'Габаритный размер детали поперек волокон.',
    icon: '📐' 
  },
  { 
    key: 'thickness', 
    label: 'Толщина (T, мм)', 
    erpTarget: 'Толщина плиты (Thickness)', 
    desc: 'Например: 16, 18, 22, 25, 38 мм.',
    icon: '🧱' 
  },
  { 
    key: 'material', 
    label: 'Материал / Декор', 
    erpTarget: 'Тип и декор плиты ЛДСП/МДФ (Material)', 
    desc: 'Например: "ЛДСП 16мм Дуб Вотан", "МДФ 19мм Эмаль RAL 9003".',
    icon: '🎨' 
  },
  { 
    key: 'quantity', 
    label: 'Количество деталей (шт)', 
    erpTarget: 'Количество одинаковых заготовок (Quantity)', 
    desc: 'Количество повторений детали данного типоразмера.',
    icon: '🔢' 
  },
  { 
    key: 'edgeL1', 
    label: 'Кромка L1 (Длина 1)', 
    erpTarget: 'Кромка по первой длине (Edge L1)', 
    desc: 'Тип или толщина кромки (например, "ПВХ 2мм", "0.4", "Дуб Вотан 1мм").',
    icon: '🪡' 
  },
  { 
    key: 'edgeL2', 
    label: 'Кромка L2 (Длина 2)', 
    erpTarget: 'Кромка по второй длине (Edge L2)', 
    desc: 'Кромка противоположной стороны по длине.',
    icon: '🪡' 
  },
  { 
    key: 'edgeW1', 
    label: 'Кромка W1 (Ширина 1)', 
    erpTarget: 'Кромка по первой ширине (Edge W1)', 
    desc: 'Кромка по первому торцу ширины.',
    icon: '🪡' 
  },
  { 
    key: 'edgeW2', 
    label: 'Кромка W2 (Ширина 2)', 
    erpTarget: 'Кромка по второй ширине (Edge W2)', 
    desc: 'Кромка противоположного торца по ширине.',
    icon: '🪡' 
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

const HARDWARE_PARAM_DESCRIPTIONS: { key: string; label: string; erpTarget: string; desc: string; icon: string }[] = [
  { 
    key: 'name', 
    label: 'Наименование фурнитуры / позиции', 
    erpTarget: 'Название комплектующего (Hardware Name)', 
    desc: 'Название позиции (например: "Петля Clip top Blumotion 110°", "Направляющие Tandem 500мм", "Конфирмат 7х50").',
    icon: '📦' 
  },
  { 
    key: 'article', 
    label: 'Артикул / Код товара', 
    erpTarget: 'Каталожный артикул / Код поставщика (Article)', 
    desc: 'Уникальный артикул производителя или внутренний код номенклатуры.',
    icon: '🏷️' 
  },
  { 
    key: 'quantity', 
    label: 'Количество (шт)', 
    erpTarget: 'Общее количество единиц (Quantity)', 
    desc: 'Число единиц фурнитуры или крепежа в спецификации заказа.',
    icon: '🔢' 
  },
  { 
    key: 'unit', 
    label: 'Единица измерения', 
    erpTarget: 'Ед. изм. (Unit)', 
    desc: 'Единица отпуска (шт, компл, м, кг, упаковка). По умолчанию "шт".',
    icon: '📐' 
  },
  { 
    key: 'category', 
    label: 'Категория / Группа', 
    erpTarget: 'Группа фурнитуры (Category)', 
    desc: 'Раздел ведомости (Петли, Направляющие, Подъемники, Крепеж, Метизы, Профиль).',
    icon: '🗂️' 
  },
  { 
    key: 'notes', 
    label: 'Примечания / Модуль', 
    erpTarget: 'Дополнительные сведения (Notes)', 
    desc: 'Где используется или комментарий (например: "Верхние модули", "Фасад Кухни", "Цвет: Чёрный").',
    icon: '💬' 
  }
];

export const ERPSettingsView: React.FC<ERPSettingsViewProps> = ({
  settings,
  onSaveSettings
}) => {
  const [activeTab, setActiveTab] = useState<'stages' | 'birka' | 'hardware' | 'rules' | 'tariffs' | 'additional' | 'equipment' | 'labels' | 'shifts'>('stages');

  const defaultStageIds = ALL_STAGES_CONFIG.map(s => s.id);
  const initialStagesOrder = (() => {
    const enabled = settings.enabledStages || defaultStageIds;
    const remaining = defaultStageIds.filter(id => !enabled.includes(id));
    return [...enabled, ...remaining];
  })();

  const [stagesOrder, setStagesOrder] = useState<ProductionStageId[]>(initialStagesOrder);

  const [formData, setFormData] = useState<ERPCompanySettings>(() => ({
    ...settings,
    enabledStages: settings.enabledStages || defaultStageIds,
    equipmentList: (settings.equipmentList && settings.equipmentList.length > 0) 
      ? settings.equipmentList 
      : DEFAULT_EQUIPMENT_LIST,
    birkaColumnMapping: settings.birkaColumnMapping || DEFAULT_BIRKA_COLUMN_MAPPING,
    hardwareColumnMapping: settings.hardwareColumnMapping || DEFAULT_HARDWARE_COLUMN_MAPPING,
    birkaEncodingPreference: settings.birkaEncodingPreference || 'auto',
    noteRules: settings.noteRules || [
      { id: 'rule-1', pattern: 'паз', instruction: 'Требуется фрезеровка паза 4 мм под заднюю стенку ХДФ', color: 'blue' },
      { id: 'rule-2', pattern: 'присадка', instruction: 'Выполнить сверление отверстий по карте присадки', color: 'purple' },
      { id: 'rule-3', pattern: 'радиус', instruction: 'Криволинейный рез / радиусная обработка R=50', color: 'amber' }
    ]
  }));

  const [isSaved, setIsSaved] = useState(false);

  const handleToggleStage = (stageId: ProductionStageId) => {
    const currentEnabled = formData.enabledStages || defaultStageIds;
    let nextEnabled: ProductionStageId[];
    if (currentEnabled.includes(stageId)) {
      if (currentEnabled.length <= 1) return;
      nextEnabled = currentEnabled.filter(id => id !== stageId);
    } else {
      // Add stage while keeping the order defined in stagesOrder
      nextEnabled = stagesOrder.filter(id => currentEnabled.includes(id) || id === stageId);
    }
    setFormData({ ...formData, enabledStages: nextEnabled });
  };

  const handleMoveStage = (stageId: ProductionStageId, direction: 'up' | 'down') => {
    const currentIndex = stagesOrder.indexOf(stageId);
    if (currentIndex === -1) return;
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= stagesOrder.length) return;

    const newOrder = [...stagesOrder];
    const temp = newOrder[currentIndex];
    newOrder[currentIndex] = newOrder[targetIndex];
    newOrder[targetIndex] = temp;
    setStagesOrder(newOrder);

    // Also update enabledStages preserving the new sequence
    const currentEnabled = formData.enabledStages || defaultStageIds;
    const updatedEnabled = newOrder.filter(id => currentEnabled.includes(id));
    setFormData({ ...formData, enabledStages: updatedEnabled });
  };

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

  const handleUpdateHardwareMapping = (paramKey: string, valueStr: string) => {
    const aliases = valueStr.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    setFormData(prev => ({
      ...prev,
      hardwareColumnMapping: {
        ...(prev.hardwareColumnMapping || DEFAULT_HARDWARE_COLUMN_MAPPING),
        [paramKey]: aliases
      }
    }));
  };

  const handleResetHardwareMapping = () => {
    setFormData(prev => ({
      ...prev,
      hardwareColumnMapping: { ...DEFAULT_HARDWARE_COLUMN_MAPPING }
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

  const handleAddNoteRule = () => {
    const newRule: ERPNoteRule = {
      id: `rule-${Date.now()}`,
      pattern: '',
      instruction: '',
      color: 'blue'
    };
    setFormData(prev => ({
      ...prev,
      noteRules: [...(prev.noteRules || []), newRule]
    }));
  };

  const handleRemoveNoteRule = (id: string) => {
    setFormData(prev => ({
      ...prev,
      noteRules: (prev.noteRules || []).filter(r => r.id !== id)
    }));
  };

  const handleUpdateNoteRule = (id: string, field: keyof ERPNoteRule, val: any) => {
    setFormData(prev => ({
      ...prev,
      noteRules: (prev.noteRules || []).map(r => r.id === id ? { ...r, [field]: val } : r)
    }));
  };

  const enabledStagesList = formData.enabledStages || ALL_STAGES_CONFIG.map(s => s.id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
            <Settings className="w-4 h-4 text-blue-600" /> Конфигурация цеха и технологического процесса
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

      {/* Settings Layout: Left Sidebar for Sections + Right Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Sections Sidebar (4 cols on lg, full width on mobile) */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-3 sm:p-4 border border-slate-200/80 shadow-sm space-y-1.5 lg:sticky lg:top-24">
          <div className="text-[11px] font-black text-slate-400 uppercase tracking-wider px-3 py-2">
            Разделы конфигурации
          </div>
          {[
            { id: 'stages', label: 'Производственные участки', desc: 'Маршруты, цеха и этапы', icon: Factory, count: enabledStagesList.length },
            { id: 'birka', label: 'Парсер бирок', desc: 'Колонки Excel / Базис / bCAD', icon: Table },
            { id: 'hardware', label: 'Парсер фурнитуры', desc: 'Колонки ведомости комплектации', icon: Box },
            { id: 'rules', label: 'Правила примечаний', desc: 'Авто-подсветка пазов и ЧПУ', icon: Sliders, count: formData.noteRules?.length },
            { id: 'tariffs', label: 'Тарифы и расценки', desc: 'Сдельная оплата за м², кромку', icon: Coins },
            { id: 'additional', label: 'Доп. работы', desc: 'Столешницы, цоколи, штанги', icon: Wrench },
            { id: 'equipment', label: 'Оборудование и план', desc: 'Станки и мощности смены', icon: Scissors, count: formData.equipmentList?.length },
            { id: 'labels', label: 'Маркировка мест', desc: 'Термоэтикетки и штрихкоды', icon: Package },
            { id: 'shifts', label: 'Режим сменности', desc: 'График, часы и нормативы', icon: Clock }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full text-left p-3 rounded-2xl font-bold text-xs flex items-center justify-between gap-3 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 border border-transparent hover:border-slate-200'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-black">{tab.label}</div>
                    <div className={`text-[10px] truncate ${isActive ? 'text-blue-100' : 'text-slate-400 font-normal'}`}>
                      {tab.desc}
                    </div>
                  </div>
                </div>

                {tab.count !== undefined && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono shrink-0 ${
                    isActive ? 'bg-white/20 text-white font-bold' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Right Active Section Content Area (8 cols) */}
        <div className="lg:col-span-8 space-y-6">

      {/* TAB 1: PRODUCTION STAGES */}
      {activeTab === 'stages' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Factory className="w-5 h-5 text-blue-600" />
                  <h3 className="font-bold text-slate-900 text-base">
                    Производственные участки (Технологическая цепочка цеха)
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Включайте или отключайте участки, а также настраивайте порядок (маршрут) движения заказов на производстве. Отключенные участки автоматически пропускаются в цепочке и сканировании.
                </p>
              </div>

              <div className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold shrink-0">
                Активно участков: {enabledStagesList.length} из {ALL_STAGES_CONFIG.length}
              </div>
            </div>

            {/* Visual Process Flow */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 overflow-x-auto">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                Текущий маршрут движения деталей ({enabledStagesList.length} этапов):
              </div>
              <div className="flex items-center gap-2 min-w-max">
                {stagesOrder
                  .map(id => ALL_STAGES_CONFIG.find(s => s.id === id))
                  .filter((s): s is typeof ALL_STAGES_CONFIG[0] => !!s && enabledStagesList.includes(s.id))
                  .map((s, idx, arr) => {
                    const Icon = s.icon;
                    return (
                      <React.Fragment key={s.id}>
                        <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 text-xs font-bold ${s.badgeBg}`}>
                          <span className="w-4 h-4 rounded-full bg-white/70 text-slate-900 text-[10px] flex items-center justify-center font-mono font-black">
                            {idx + 1}
                          </span>
                          <Icon className="w-3.5 h-3.5" />
                          <span>{s.name}</span>
                        </div>
                        {idx < arr.length - 1 && (
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        )}
                      </React.Fragment>
                    );
                  })}
              </div>
            </div>

            {/* Grid of all Stages with Order controls and No ID / No Department */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {stagesOrder.map((stageId, orderIndex) => {
                const stage = ALL_STAGES_CONFIG.find(s => s.id === stageId);
                if (!stage) return null;
                const isEnabled = enabledStagesList.includes(stage.id);
                const Icon = stage.icon;
                const isFirst = orderIndex === 0;
                const isLast = orderIndex === stagesOrder.length - 1;

                return (
                  <div
                    key={stage.id}
                    className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                      isEnabled
                        ? 'bg-white border-slate-300 shadow-xs'
                        : 'bg-slate-50/70 border-slate-200 opacity-65'
                    }`}
                  >
                    <div>
                      {/* Top Header: Order Number, Title, and Toggle */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 ${
                            isEnabled ? stage.badgeBg : 'bg-slate-100 text-slate-400 border-slate-200'
                          }`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] font-mono font-black text-slate-600">
                                #{orderIndex + 1}
                              </span>
                              <div className="font-bold text-sm text-slate-900 truncate">{stage.name}</div>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleToggleStage(stage.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                            isEnabled
                              ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-xs'
                              : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                          }`}
                        >
                          {isEnabled ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : null}
                          {isEnabled ? 'Включен' : 'Отключен'}
                        </button>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed mb-3">
                        {stage.description}
                      </p>
                    </div>

                    {/* Bottom Row: Reorder Sequence Buttons & Status */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] text-slate-400 mr-1">Порядок:</span>
                        <button
                          type="button"
                          disabled={isFirst}
                          onClick={() => handleMoveStage(stage.id, 'up')}
                          title="Переместить этап раньше в технологической цепочке"
                          className="p-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed text-slate-700 transition-colors cursor-pointer"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          disabled={isLast}
                          onClick={() => handleMoveStage(stage.id, 'down')}
                          title="Переместить этап позже в технологической цепочке"
                          className="p-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed text-slate-700 transition-colors cursor-pointer"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs font-bold ${isEnabled ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {isEnabled ? '● В маршруте' : '○ Отключен'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BIRKA PARSER */}
      {activeTab === 'birka' && (
        <div className="space-y-6">
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
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition-colors cursor-pointer"
                  title="Применить готовый шаблон для Базис-Мебельщик"
                >
                  Базис
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('bcad')}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition-colors cursor-pointer"
                  title="Применить готовый шаблон для bCAD"
                >
                  bCAD
                </button>
                <button
                  type="button"
                  onClick={handleResetBirkaMapping}
                  className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
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
        </div>
      )}

      {/* TAB: HARDWARE PARSER MAPPING */}
      {activeTab === 'hardware' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <Box className="w-5 h-5 text-cyan-600" />
                  <h3 className="font-bold text-slate-900 text-base">
                    Сопоставление колонок комплектовочной ведомости (Фурнитура)
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Настройте имена колонок для файлов Excel (.xlsx), CSV, TSV, XML и Базис-Спецификации, чтобы парсер автоматически находил названия фурнитуры, артикулы, количество и категории.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetHardwareMapping}
                  className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                  title="Сбросить все синонимы на исходные"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Сбросить настройки
                </button>
              </div>
            </div>

            <div className="p-4 bg-cyan-50/70 rounded-2xl border border-cyan-100 flex items-start gap-3 text-xs text-cyan-950">
              <Info className="w-5 h-5 text-cyan-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <strong>Автоопределение фурнитуры:</strong> При загрузке комплектовочной ведомости система анализирует заголовки таблицы и автоматически относит найденные позиции к категориям (Петли, Направляющие, Подъемники, Крепеж и т.д.). Введите синонимы через запятую, чтобы подстроить систему под специфические выгрузки вашей программы.
              </div>
            </div>

            {/* Parameters Mapping Grid */}
            <div className="space-y-3">
              {HARDWARE_PARAM_DESCRIPTIONS.map((param) => {
                const currentAliases = (formData.hardwareColumnMapping && formData.hardwareColumnMapping[param.key]) 
                  ? formData.hardwareColumnMapping[param.key]
                  : (DEFAULT_HARDWARE_COLUMN_MAPPING[param.key] || []);

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
                        <div className="text-[11px] font-semibold text-cyan-700 mt-1">
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
                          onChange={(e) => handleUpdateHardwareMapping(param.key, e.target.value)}
                          placeholder="Например: наименование, номенклатура, товар"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 font-mono text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-cyan-500 outline-none"
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
        </div>
      )}

      {/* TAB 3: NOTE RULES */}
      {activeTab === 'rules' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-purple-600" />
                  <h3 className="font-bold text-slate-900 text-base">
                    Правила распознавания примечаний и операций ЧПУ
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Автоматическое выделение цветовыми бейджами и инструкциями специальных пометок из Базис/bCAD (пазы, присадка, четверти, радиусы).
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddNoteRule}
                className="px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Добавить правило
              </button>
            </div>

            <div className="space-y-3">
              {(formData.noteRules || []).map((rule) => (
                <div key={rule.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col md:flex-row items-center gap-3">
                  <div className="w-full md:w-48">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Поисковый паттерн</label>
                    <input
                      type="text"
                      value={rule.pattern}
                      onChange={(e) => handleUpdateNoteRule(rule.id, 'pattern', e.target.value)}
                      placeholder="паз, присадка, 4-8-36"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 font-mono font-bold text-slate-900 text-xs focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                  </div>

                  <div className="w-full md:flex-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Инструкция для мастера на станке</label>
                    <input
                      type="text"
                      value={rule.instruction}
                      onChange={(e) => handleUpdateNoteRule(rule.id, 'instruction', e.target.value)}
                      placeholder="Фрезеровка паза 4 мм под заднюю стенку ХДФ"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 text-xs focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                  </div>

                  <div className="w-full md:w-32">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Цвет бейджа</label>
                    <select
                      value={rule.color || 'blue'}
                      onChange={(e) => handleUpdateNoteRule(rule.id, 'color', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 font-bold text-xs text-slate-800 focus:ring-2 focus:ring-purple-500 outline-none"
                    >
                      <option value="blue">Синий</option>
                      <option value="purple">Фиолетовый</option>
                      <option value="amber">Оранжевый</option>
                      <option value="emerald">Зеленый</option>
                      <option value="rose">Красный</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveNoteRule(rule.id)}
                    className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer mt-2 md:mt-4"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: TARIFFS */}
      {activeTab === 'tariffs' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-6">
            <div>
              <h3 className="font-bold text-slate-900 text-base mb-1">Тарифы сдельной выработки мастеров</h3>
              <p className="text-xs text-slate-400">Расценки за технологические операции для автоматического расчета сдельной зарплаты в цеху</p>
            </div>

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
                  <Wrench className="w-4 h-4 text-emerald-600" />
                  Сборка корпуса (₽ за шт.)
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
        </div>
      )}

      {/* TAB 5: ADDITIONAL WORKS */}
      {activeTab === 'additional' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 text-base mb-1">Дополнительные производственные работы</h3>
            <p className="text-xs text-slate-400">Настройка отображения блока специфических работ (столешница, стеновая панель, нарезка штанги/трубы, нарезка цоколя) при планировании и загрузке бирок</p>

            <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200 cursor-pointer hover:bg-slate-100/80 transition-colors">
              <input
                type="checkbox"
                checked={formData.showAdditionalWorksOnUpload ?? true}
                onChange={(e) => setFormData({ ...formData, showAdditionalWorksOnUpload: e.target.checked })}
                className="w-5 h-5 rounded-lg border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <div>
                <div className="font-bold text-xs text-slate-900">
                  Показывать блок "Дополнительные работы" в карточке заказа и при загрузке бирок
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Позволяет технологу и мастеру фиксировать распил/кромление/радиус столешниц, стеновых панелей, нарезку гардеробных штанг и цоколей.
                </div>
              </div>
            </label>
          </div>
        </div>
      )}

      {/* TAB 6: EQUIPMENT & PRODUCTION TARGETS */}
      {activeTab === 'equipment' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-6">
            <div>
              <h3 className="font-bold text-slate-900 text-base mb-1">Плановые объемы выработки и оборудование цеха</h3>
              <p className="text-xs text-slate-400">
                Целевые показатели цеха за месяц и станочный парк для аналитических отчетов и учета загрузки участков
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
                        <option value="kitting">Комплектовка</option>
                        <option value="qc">ОТК</option>
                        <option value="packing">Упаковка</option>
                        <option value="shipping">Склад</option>
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
        </div>
      )}

      {/* TAB 7: LABELS */}
      {activeTab === 'labels' && (
        <div className="space-y-6">
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
                      <div className="text-xs font-bold text-slate-900">Печатать список вложенных деталей</div>
                      <div className="text-[11px] text-slate-500">Перечень деталей, входящих в данное упакованное место</div>
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
                      <div className="text-xs font-bold text-slate-900">Печатать QR-код места для сканера водителя/склада</div>
                      <div className="text-[11px] text-slate-500">Позволяет мгновенно считывать статус места</div>
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
        </div>
      )}

      {/* TAB 8: SHIFTS */}
      {activeTab === 'shifts' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
            <h3 className="font-bold text-slate-900 text-base mb-1">Режим работы цеха и смены</h3>
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
        </div>
      )}

          {/* Bottom Save Bar inside content */}
          <div className="flex justify-end pt-4">
            <button
              onClick={() => handleSave()}
              className="px-8 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-200 transition-all flex items-center gap-2 cursor-pointer"
            >
              {isSaved ? <CheckCircle2 className="w-5 h-5 text-emerald-300" /> : <Save className="w-5 h-5" />}
              {isSaved ? 'Сохранено!' : 'Сохранить все настройки'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

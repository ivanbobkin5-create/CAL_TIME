import React, { useState, useMemo } from 'react';
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
  MapPin,
  Map as MapIcon,
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
  Sparkles,
  Search,
  Package,
  Workflow,
  LayoutDashboard,
  Calendar,
  CalendarDays,
  DollarSign,
  BarChart3,
  Users,
  Archive,
  RefreshCw,
  Link2,
  AlertCircle,
  ListFilter,
  Edit3
} from 'lucide-react';
import { ERPCompanySettings, MachineEquipment, PackageLabelSettings, ProductionStageId, ERPNoteRule, ProductionOrder, ERPEmployee } from '../types';
import { DEFAULT_BIRKA_COLUMN_MAPPING } from '../utils/birkaParser';
import { DEFAULT_HARDWARE_COLUMN_MAPPING } from '../utils/hardwareParser';
import { WarehouseCatalogPickerModal } from '../components/WarehouseCatalogPickerModal';
import { evaluateBirkaQrTemplate, matchDetailToScannedCode, decomposeBarcodeForDiagnostics } from '../utils';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { smartDecodeFile } from '../../../utils/fileEncodingDetector';

interface ERPSettingsViewProps {
  settings: ERPCompanySettings;
  orders?: ProductionOrder[];
  catalogProducts?: any[];
  employees?: ERPEmployee[];
  companyName?: string;
  companyData?: any;
  companyId?: string;
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
  orders = [],
  catalogProducts = [],
  employees = [],
  companyName,
  companyData,
  companyId,
  onSaveSettings
}) => {
  const [activeTab, setActiveTab] = useState<'stages' | 'birka' | 'hardware' | 'warehouse_cells' | 'rules' | 'tariffs' | 'additional' | 'equipment' | 'labels' | 'shifts' | 'bitrix_delivery'>('stages');

  const defaultStageIds = ALL_STAGES_CONFIG.map(s => s.id);
  const initialStagesOrder = (() => {
    const enabled = settings.enabledStages || defaultStageIds;
    const remaining = defaultStageIds.filter(id => !enabled.includes(id));
    return [...enabled, ...remaining];
  })();

  const [stagesOrder, setStagesOrder] = useState<ProductionStageId[]>(initialStagesOrder);

  const [formData, setFormData] = useState<ERPCompanySettings>(() => ({
    ...settings,
    bitrix24WebhookUrl: settings.bitrix24WebhookUrl || companyData?.bitrix24?.webhookUrl || companyData?.erpConfig?.bitrix24WebhookUrl || '',
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

  // Bitrix24 Stage Auto-fetching State
  const [b24Categories, setB24Categories] = useState<{ id: string; name: string }[]>([]);
  const [b24Stages, setB24Stages] = useState<{ id: string; name: string; categoryId?: string; categoryName?: string }[]>([]);
  const [selectedB24Category, setSelectedB24Category] = useState<string>('all');
  const [isFetchingB24Stages, setIsFetchingB24Stages] = useState(false);
  const [b24FetchStatus, setB24FetchStatus] = useState<string | null>(null);
  const [manualStageInputMode, setManualStageInputMode] = useState<boolean>(false);

  const activeWebhookUrl = useMemo(() => {
    return formData.bitrix24WebhookUrl || companyData?.bitrix24?.webhookUrl || companyData?.erpConfig?.bitrix24WebhookUrl || '';
  }, [formData.bitrix24WebhookUrl, companyData]);

  const loadBitrix24Data = async (customUrl?: string) => {
    const url = (customUrl !== undefined ? customUrl : activeWebhookUrl).trim();
    if (!url) {
      setB24FetchStatus('Вебхук Битрикс24 не указан. Укажите URL входящего вебхука.');
      return;
    }

    setIsFetchingB24Stages(true);
    setB24FetchStatus('Подключение к Битрикс24...');

    try {
      // 1. Fetch deal categories
      const catRes = await fetch("/api/bitrix24/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          webhookUrl: url,
          method: "crm.dealcategory.list",
          params: {}
        })
      });

      let categoryList: { id: string; name: string }[] = [{ id: "0", name: "Общее направление" }];
      if (catRes.ok) {
        const catData = await catRes.json();
        if (catData.result && Array.isArray(catData.result)) {
          catData.result.forEach((cat: any) => {
            categoryList.push({ id: String(cat.ID), name: cat.NAME });
          });
        }
      }
      setB24Categories(categoryList);

      // 2. Fetch stages for each category
      const allFetchedStages: { id: string; name: string; categoryId: string; categoryName: string }[] = [];

      for (const cat of categoryList) {
        const entityId = cat.id === "0" ? "DEAL_STAGE" : `DEAL_STAGE_${cat.id}`;
        const stRes = await fetch("/api/bitrix24/query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            webhookUrl: url,
            method: "crm.status.list",
            params: { filter: { ENTITY_ID: entityId } }
          })
        });

        if (stRes.ok) {
          const stData = await stRes.json();
          if (stData.result && Array.isArray(stData.result)) {
            stData.result.forEach((st: any) => {
              allFetchedStages.push({
                id: String(st.STATUS_ID),
                name: st.NAME,
                categoryId: cat.id,
                categoryName: cat.name
              });
            });
          }
        }
      }

      setB24Stages(allFetchedStages);
      if (allFetchedStages.length > 0) {
        setB24FetchStatus(`Успешно загружено ${allFetchedStages.length} стадий (${categoryList.length} напр.)`);
      } else {
        setB24FetchStatus('Стадии не найдены. Проверьте настройки вебхука');
      }
    } catch (err: any) {
      console.error('Error loading B24 stages:', err);
      setB24FetchStatus('Ошибка загрузки стадий: ' + (err.message || String(err)));
    } finally {
      setIsFetchingB24Stages(false);
    }
  };

  // Auto-load stages when bitrix_delivery tab opens if URL exists and stages not loaded yet
  React.useEffect(() => {
    if (activeTab === 'bitrix_delivery' && activeWebhookUrl && b24Stages.length === 0 && !isFetchingB24Stages) {
      loadBitrix24Data(activeWebhookUrl);
    }
  }, [activeTab, activeWebhookUrl]);

  const filteredB24Stages = useMemo(() => {
    if (selectedB24Category === 'all') return b24Stages;
    return b24Stages.filter(s => s.categoryId === selectedB24Category);
  }, [b24Stages, selectedB24Category]);

  const [isSaved, setIsSaved] = useState(false);

  const [parsedColumns, setParsedColumns] = useState<string[]>([]);
  const [parsedFirstRow, setParsedFirstRow] = useState<Record<string, any> | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const [testScanCode, setTestScanCode] = useState<string>('00-0000-00_00.00');
  const [testOrderNumber, setTestOrderNumber] = useState<string>('00-0000-00');
  const [testPartNumber, setTestPartNumber] = useState<string>('00.00');

  const normalizedSampleRow = useMemo(() => {
    if (!parsedFirstRow) {
      return {
        orderNumber: '00-0000-00',
        labelNumber: '00.00',
        material: 'ЛДСП 16 мм',
        length: 700,
        width: 500,
        thickness: 16,
        name: 'Боковина шкафа',
        quantity: 1,
        'Заказ': '00-0000-00',
        '№ детали': '00.00',
        'Материал': 'ЛДСП 16 мм',
        'Длина': '700',
        'Ширина': '500',
        'Толщина': '16',
        'Количество': '1'
      };
    }

    const row = parsedFirstRow;
    const normalized: Record<string, any> = { ...row };
    
    // Define mapping rules matching evaluateBirkaQrTemplate switch-case
    const maps = {
      orderNumber: ['заказ', 'номер заказа', 'сделка', 'номер_заказа', 'зак', '№ заказа', '№заказа', 'ordernumber', 'order_number', 'order'],
      labelNumber: ['позиция', 'поз', '№ детали', 'номер детали', 'деталь №', 'деталь', '№', '№детали', 'номер_детали', 'pos', 'position', 'id', 'labelnumber'],
      name: ['наименование', 'название', 'имя', 'name', 'title', 'part'],
      material: ['материал', 'плита', 'лдсп', 'мдф', 'хдф', 'мат', 'material', 'mat'],
      length: ['длина', 'длин', 'l_мм', 'length', 'len', 'l'],
      width: ['ширина', 'шир', 'w_мм', 'width', 'wid', 'w'],
      thickness: ['толщина', 'толщ', 't_мм', 'thickness', 'thick', 't'],
      quantity: ['количество', 'кол', 'шт', 'кол-во', 'к-во', 'quantity', 'qty', 'count'],
      barcode: ['штрихкод', 'штрих', 'код', 'barcode']
    };

    Object.entries(row).forEach(([colName, val]) => {
      const cleanCol = colName.trim().toLowerCase();
      
      // Find if this colName fits any mapping
      Object.entries(maps).forEach(([fieldKey, aliases]) => {
        if (aliases.includes(cleanCol)) {
          normalized[fieldKey] = val;
        }
      });
    });
    
    return normalized;
  }, [parsedFirstRow]);

  const handleSampleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setParseError(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);

      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        const workbook = XLSX.read(uint8, { type: 'array' });
        const wsname = workbook.SheetNames[0];
        const ws = workbook.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 });
        
        if (data.length === 0) {
          throw new Error('Файл пуст');
        }

        const headers = data[0].map((h: any) => String(h || '').trim()).filter(Boolean);
        let firstDataRow: any[] | null = null;
        for (let i = 1; i < data.length; i++) {
          if (data[i] && data[i].some((cell: any) => cell !== null && cell !== undefined && cell !== '')) {
            firstDataRow = data[i];
            break;
          }
        }

        if (!firstDataRow) {
          throw new Error('Данные в файле не найдены (строки после заголовка пусты)');
        }

        const firstRowObj: Record<string, any> = {};
        headers.forEach((h: string, idx: number) => {
          firstRowObj[h] = firstDataRow[idx] !== undefined ? String(firstDataRow[idx]) : '';
        });

        setParsedColumns(headers);
        setParsedFirstRow(firstRowObj);
      } else {
        const decoded = await smartDecodeFile(uint8);
        const parsed = Papa.parse(decoded.text, {
          skipEmptyLines: true,
          header: false
        });

        if (!parsed.data || parsed.data.length === 0) {
          throw new Error('Файл пуст или не содержит данных');
        }

        const rows = parsed.data as any[][];
        const headers = rows[0].map((h: any) => String(h || '').trim()).filter(Boolean);
        
        let firstDataRow: any[] | null = null;
        for (let i = 1; i < rows.length; i++) {
          if (rows[i] && rows[i].some((cell: any) => cell !== null && cell !== undefined && cell !== '')) {
            firstDataRow = rows[i];
            break;
          }
        }

        if (!firstDataRow) {
          throw new Error('В файле не найдено строк с данными');
        }

        const firstRowObj: Record<string, any> = {};
        headers.forEach((h: string, idx: number) => {
          firstRowObj[h] = firstDataRow[idx] !== undefined ? String(firstDataRow[idx]) : '';
        });

        setParsedColumns(headers);
        setParsedFirstRow(firstRowObj);
      }
    } catch (err: any) {
      console.error(err);
      setParseError(`Не удалось прочитать файл: ${err.message || 'неверный формат'}`);
    }
  };

  const handleAddColumnToTemplate = (col: string) => {
    const current = formData.birkaQrFormatTemplate ?? '{orderNumber}-{pos}';
    setFormData({
      ...formData,
      birkaQrFormatTemplate: `${current}{${col}}`
    });
  };

  const handleAddSeparatorToTemplate = (sep: string) => {
    const current = formData.birkaQrFormatTemplate ?? '{orderNumber}-{pos}';
    setFormData({
      ...formData,
      birkaQrFormatTemplate: `${current}${sep}`
    });
  };

  const handleBackspaceTemplate = () => {
    const current = formData.birkaQrFormatTemplate ?? '{orderNumber}-{pos}';
    if (!current) return;
    
    if (current.endsWith('}')) {
      const lastOpenIdx = current.lastIndexOf('{');
      if (lastOpenIdx !== -1) {
        setFormData({
          ...formData,
          birkaQrFormatTemplate: current.substring(0, lastOpenIdx)
        });
        return;
      }
    }
    
    setFormData({
      ...formData,
      birkaQrFormatTemplate: current.substring(0, current.length - 1)
    });
  };

  const handleClearTemplate = () => {
    setFormData({
      ...formData,
      birkaQrFormatTemplate: ''
    });
  };

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

  // --- WAREHOUSE CELLS MANAGEMENT ---
  const [cellSearch, setCellSearch] = useState('');
  const [cellCategoryFilter, setCellCategoryFilter] = useState('all');
  const [newItemName, setNewItemName] = useState('');
  const [newItemArticle, setNewItemArticle] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('Петли и доводчики');
  const [newItemCell, setNewItemCell] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Aggregate unique items from catalog + loaded order hardware items
  const aggregatedWarehouseItems = useMemo<{ id: string; name: string; article?: string; category?: string; storageCell: string }[]>(() => {
    const map = new Map<string, { id: string; name: string; article?: string; category?: string; storageCell: string }>();

    // 1. Existing catalog in settings
    (formData.warehouseItemsCatalog || []).forEach(it => {
      const key = `${it.article || ''}:::${it.name.toLowerCase().trim()}`;
      map.set(key, { ...it });
    });

    // 2. Scan all orders hardware items
    orders.forEach(order => {
      if (order.hardwareData?.items) {
        order.hardwareData.items.forEach(hw => {
          const key = `${hw.article || ''}:::${hw.name.toLowerCase().trim()}`;
          const existingCell = formData.warehouseLocations?.[key] || '';
          if (!map.has(key)) {
            map.set(key, {
              id: `wh-${key.replace(/[^a-z0-9]/gi, '_')}`,
              name: hw.name,
              article: hw.article,
              category: hw.category || 'Разное / Крепеж',
              storageCell: existingCell
            });
          } else {
            // Keep cell if present
            const curr = map.get(key)!;
            if (!curr.storageCell && existingCell) {
              curr.storageCell = existingCell;
            }
          }
        });
      }
    });

    return Array.from(map.values());
  }, [formData.warehouseItemsCatalog, formData.warehouseLocations, orders]);

  const handleUpdateItemCell = (itemKey: string, itemName: string, itemArticle: string | undefined, itemCategory: string | undefined, newCell: string) => {
    const cleanCell = newCell.trim().toUpperCase();
    const updatedLocations = {
      ...(formData.warehouseLocations || {}),
      [itemKey]: cleanCell
    };

    const existingCatalog = [...(formData.warehouseItemsCatalog || [])];
    const catIndex = existingCatalog.findIndex(c => `${c.article || ''}:::${c.name.toLowerCase().trim()}` === itemKey);

    if (catIndex >= 0) {
      existingCatalog[catIndex] = {
        ...existingCatalog[catIndex],
        storageCell: cleanCell
      };
    } else {
      existingCatalog.push({
        id: `wh-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: itemName,
        article: itemArticle,
        category: itemCategory || 'Разное / Крепеж',
        storageCell: cleanCell
      });
    }

    setFormData({
      ...formData,
      warehouseLocations: updatedLocations,
      warehouseItemsCatalog: existingCatalog
    });
  };

  const handleAddNewWarehouseItem = () => {
    if (!newItemName.trim()) return;
    const cleanName = newItemName.trim();
    const cleanArticle = newItemArticle.trim() || undefined;
    const key = `${cleanArticle || ''}:::${cleanName.toLowerCase()}`;
    handleUpdateItemCell(key, cleanName, cleanArticle, newItemCategory, newItemCell);

    setNewItemName('');
    setNewItemArticle('');
    setNewItemCell('');
    setShowAddForm(false);
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

  const columnsToDisplay = parsedColumns.length > 0 
    ? parsedColumns 
    : ['Заказ', '№ детали', 'Материал', 'Длина', 'Ширина', 'Толщина', 'Количество'];

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
            { id: 'warehouse_cells', label: 'Ячейки хранения', desc: 'Адресное хранение склада', icon: MapPin },
            { id: 'rules', label: 'Правила примечаний', desc: 'Авто-подсветка пазов и ЧПУ', icon: Sliders, count: formData.noteRules?.length },
            { id: 'tariffs', label: 'Тарифы и расценки', desc: 'Сдельная оплата за м², кромку', icon: Coins },
            { id: 'additional', label: 'Доп. работы', desc: 'Столешницы, цоколи, штанги', icon: Wrench },
            { id: 'equipment', label: 'Оборудование и план', desc: 'Станки и мощности смены', icon: Scissors, count: formData.equipmentList?.length },
            { id: 'labels', label: 'Маркировка мест', desc: 'Термоэтикетки и штрихкоды', icon: Package },
            { id: 'bitrix_delivery', label: 'Битрикс24 и печать Акта', desc: 'Поля Битрикс, Акт и ТТН', icon: Truck },
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
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2.5 border-b border-slate-100">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center border shrink-0 ${
                            isEnabled ? stage.badgeBg : 'bg-slate-100 text-slate-400 border-slate-200'
                          }`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] font-mono font-black text-slate-600 shrink-0">
                                #{orderIndex + 1}
                              </span>
                              <div className="font-bold text-xs sm:text-sm text-slate-900 leading-snug break-words">
                                {stage.name}
                              </div>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleToggleStage(stage.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
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

            {/* Voice & Auto-dismiss Notification Settings Card */}
            <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 text-white rounded-3xl p-6 border-2 border-emerald-400/80 shadow-xl space-y-4">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/30 border border-emerald-400/50 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 text-emerald-300" />
                </div>
                <div>
                  <h3 className="font-black text-white text-base">
                    Голосовой ассистент и таймер готовой детали (Кромление)
                  </h3>
                  <p className="text-xs text-emerald-200 mt-1 leading-relaxed">
                    На этапе кромления, если сканируемая деталь не требует присадки, ERP произнесет голосом <strong>«Готовая деталь»</strong> и порекомендует отложить её в отдельную пачку готовых деталей.
                  </p>
                </div>
              </div>

              <div className="bg-emerald-950/80 border border-emerald-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-white">
                    Время автоскрытия всплывающего сообщения
                  </div>
                  <div className="text-[11px] text-emerald-300">
                    Укажите время в секундах, через которое окно готовой детали закроется автоматически (также мастер может нажать «Ок»)
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={formData.finishedPartNoticeDuration ?? 5}
                    onChange={(e) => setFormData({
                      ...formData,
                      finishedPartNoticeDuration: Math.max(1, parseInt(e.target.value, 10) || 5)
                    })}
                    className="w-20 px-3 py-2 rounded-xl bg-slate-900 border border-emerald-400 font-mono font-black text-center text-sm text-emerald-300 outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                  <span className="text-xs font-bold text-emerald-200">сек.</span>
                </div>
              </div>
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

            {/* Режим распознавания штрихкодов */}
            <div className="p-6 bg-slate-900 text-white rounded-3xl border border-slate-800 shadow-xl space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-400/30 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">
                    Алгоритм распознавания QR-кодов
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Выберите, как программа должна сопоставлять отсканированные коды с деталями в заказе.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, birkaQrMatchingMode: 'smart_contains' })}
                  className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col gap-1.5 cursor-pointer ${
                    (formData.birkaQrMatchingMode ?? 'smart_contains') === 'smart_contains'
                      ? 'bg-emerald-950/40 border-emerald-500 text-white ring-2 ring-emerald-500/20'
                      : 'bg-slate-950/55 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs uppercase tracking-wider text-emerald-400">
                      Вариант 3: «Умный» авто-поиск
                    </span>
                    {(formData.birkaQrMatchingMode ?? 'smart_contains') === 'smart_contains' && (
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                    )}
                  </div>
                  <span className="text-xs font-semibold text-white">Поиск по вхождению (Рекомендуемый)</span>
                  <span className="text-[11px] text-slate-400 leading-relaxed mt-1">
                    Программа не требует жесткого совпадения шаблонов. Она автоматически проверит, содержит ли QR-код номер заказа и номер детали в любом формате (с разделителями, префиксами и т.д.). Идеально подходит, если формат наклеек меняется.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, birkaQrMatchingMode: 'template' })}
                  className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col gap-1.5 cursor-pointer ${
                    formData.birkaQrMatchingMode === 'template'
                      ? 'bg-indigo-950/40 border-indigo-500 text-white ring-2 ring-indigo-500/20'
                      : 'bg-slate-950/55 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs uppercase tracking-wider text-indigo-400">
                      Строгий шаблон
                    </span>
                    {formData.birkaQrMatchingMode === 'template' && (
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-400"></span>
                    )}
                  </div>
                  <span className="text-xs font-semibold text-white">Точное соответствие шаблону текста</span>
                  <span className="text-[11px] text-slate-400 leading-relaxed mt-1">
                    Сравнение отсканированной строки строго с результатом генератора шаблона, указанного ниже (например, строго строка <code className="text-indigo-300">1042-02.01</code>). Любое отклонение вызовет ошибку сканирования.
                  </span>
                </button>
              </div>
            </div>

            {/* QR Code / Barcode Template Builder */}
            <div className="p-6 bg-gradient-to-br from-indigo-950 via-slate-900 to-blue-950 text-white rounded-3xl border border-indigo-400/30 shadow-xl space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center shrink-0">
                    <QrCode className="w-5 h-5 text-indigo-300" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">
                      Формат составного QR-кода / Штрихкода на бирке
                    </h4>
                    <p className="text-xs text-indigo-200 mt-0.5">
                      Укажите из каких полей формируется QR-код при сканировании деталей на участках.
                    </p>
                  </div>
                </div>

                <span className="px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/40 text-[11px] font-mono font-bold text-indigo-300 shrink-0">
                  QR Template Builder
                </span>
              </div>

              {/* Interactive File-based QR Code Constructor */}
              <div className="space-y-4 bg-slate-900/60 p-5 rounded-2xl border border-indigo-500/20">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-500/10 pb-4">
                  <div>
                    <h5 className="text-xs font-black text-indigo-300 uppercase tracking-wider">
                      Шаг 1: Загрузка файла-примера из вашей программы
                    </h5>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Загрузите файл раскроя (CSV, TXT, XLS, XLSX) для автоматического извлечения колонок и данных первой строки
                    </p>
                  </div>

                  <div className="relative">
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv,.txt"
                      onChange={handleSampleFileUpload}
                      className="hidden"
                      id="qr-sample-file-input"
                    />
                    <label
                      htmlFor="qr-sample-file-input"
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black flex items-center gap-2 cursor-pointer transition-all shadow-sm"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      <span>{fileName ? 'Сменить файл' : 'Загрузить файл'}</span>
                    </label>
                  </div>
                </div>

                {/* File Upload Status & Parsed Columns */}
                <div className="space-y-3">
                  {fileName ? (
                    <div className="flex items-center justify-between bg-emerald-950/40 border border-emerald-500/30 p-3 rounded-xl">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <div>
                          <div className="text-xs font-bold text-white font-mono">{fileName}</div>
                          <div className="text-[10px] text-emerald-300 font-medium">Файл успешно распознан! Найдено {parsedColumns.length} столбцов.</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setFileName(null);
                          setParsedColumns([]);
                          setParsedFirstRow(null);
                          setParseError(null);
                        }}
                        className="text-[10px] font-bold text-rose-400 hover:text-rose-300 underline cursor-pointer"
                      >
                        Сбросить файл
                      </button>
                    </div>
                  ) : (
                    <div className="bg-slate-950/40 border border-slate-800 p-3 rounded-xl text-center">
                      <p className="text-[11px] text-slate-400">
                        💡 Нет загруженного файла. Ниже показаны стандартные столбцы-примеры. Загрузите файл из Базиса, чтобы использовать ваши реальные названия!
                      </p>
                    </div>
                  )}

                  {parseError && (
                    <div className="p-3 bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs font-bold rounded-xl animate-bounce">
                      ⚠️ {parseError}
                    </div>
                  )}

                  {/* Clean Standard QR Format */}
                  <div className="bg-slate-950/60 rounded-2xl border border-indigo-500/30 p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h5 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                          <QrCode className="w-5 h-5 text-indigo-400" />
                          <span>Стандартный формат QR-кодов бирок</span>
                        </h5>
                        <p className="text-xs text-slate-300 mt-1">
                          Номер заказа через нижнее подчеркивание <code className="text-indigo-300 bg-slate-900 px-1.5 py-0.5 rounded font-mono font-bold">_</code> и номер позиции детали:
                        </p>
                      </div>

                      <div className="px-3 py-1.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-mono font-bold text-xs shrink-0 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>{'{НомерЗаказа}_{НомерПозиции}'}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                        <div className="text-[10px] font-black uppercase text-indigo-300 tracking-wider">Основной формат QR:</div>
                        <div className="text-base font-mono font-black text-emerald-400 mt-1">11-0626-11_20.02</div>
                        <div className="text-[10px] text-slate-400 mt-1">Сканируется со стикера бирки Базис-Мебельщика</div>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                        <div className="text-[10px] font-black uppercase text-indigo-300 tracking-wider">Ручной ввод / короткий номер:</div>
                        <div className="text-base font-mono font-black text-indigo-300 mt-1">20.02</div>
                        <div className="text-[10px] text-slate-400 mt-1">Или ввод только номера позиции детали</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Live Barcode & QR Diagnostics / Testing Simulator */}
                <div className="bg-slate-950/80 rounded-2xl border border-indigo-500/30 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <h5 className="text-xs font-black text-white uppercase tracking-wider">
                          Интерактивный тестер сканирования (Проверка распознавания)
                        </h5>
                        <p className="text-[10px] text-slate-400">
                          Введите или отсканируйте реальный QR-код, чтобы проверить, как алгоритм сопоставит деталь
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-300 uppercase mb-1">
                        Тестовый номер заказа:
                      </label>
                      <input
                        type="text"
                        value={testOrderNumber}
                        onChange={(e) => setTestOrderNumber(e.target.value)}
                        placeholder="Например: 00-0000-00"
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-white focus:ring-1 focus:ring-indigo-400 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-300 uppercase mb-1">
                        Тестовый номер детали в заказе:
                      </label>
                      <input
                        type="text"
                        value={testPartNumber}
                        onChange={(e) => setTestPartNumber(e.target.value)}
                        placeholder="Например: 00.00"
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-white focus:ring-1 focus:ring-indigo-400 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-emerald-300 uppercase mb-1">
                        Отсканированный QR-код / Штрихкод:
                      </label>
                      <input
                        type="text"
                        value={testScanCode}
                        onChange={(e) => setTestScanCode(e.target.value)}
                        placeholder="Например: 00-0000-00_00.00"
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-emerald-500/50 text-xs font-mono text-emerald-300 focus:ring-1 focus:ring-emerald-400 outline-none"
                      />
                    </div>
                  </div>

                  {/* Diagnostic Calculation Result */}
                  {(() => {
                    const samplePartObj = {
                      id: 'test_part_1',
                      labelNumber: testPartNumber,
                      orderNumber: testOrderNumber,
                      name: 'Тестовая деталь',
                      material: 'ЛДСП 16 мм'
                    };
                    const diag = decomposeBarcodeForDiagnostics(
                      testScanCode,
                      testOrderNumber,
                      samplePartObj,
                      formData.birkaQrFormatTemplate
                    );

                    return (
                      <div className={`p-3 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                        diag.isMatch 
                          ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200' 
                          : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                      }`}>
                        <div className="flex items-center gap-2.5">
                          {diag.isMatch ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                          ) : (
                            <Info className="w-5 h-5 text-rose-400 shrink-0" />
                          )}
                          <div>
                            <div className="text-xs font-bold flex items-center gap-2">
                              <span>Статус сопоставления:</span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                diag.isMatch ? 'bg-emerald-500/30 text-emerald-300' : 'bg-rose-500/30 text-rose-300'
                              }`}>
                                {diag.isMatch ? '✓ УСПЕШНО РАСПОЗНАНО' : '✗ ДЕТАЛЬ НЕ НАЙДЕНА'}
                              </span>
                            </div>
                            <div className="text-[11px] opacity-80 mt-0.5">
                              {diag.isMatch 
                                ? `Код "${testScanCode}" идеально привязывается к детали №${testPartNumber} в заказе №${testOrderNumber}`
                                : `Код "${testScanCode}" не соответствует детали №${testPartNumber}. Проверьте шаблон или разделители.`
                              }
                            </div>
                          </div>
                        </div>

                        {/* Quick test buttons */}
                        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                          <span className="text-[9px] uppercase font-bold text-slate-400">Тест:</span>
                          <button
                            type="button"
                            onClick={() => {
                              setTestOrderNumber('11-0626-11');
                              setTestPartNumber('20.02');
                              setTestScanCode('11-0626-11_20.02');
                            }}
                            className="px-2 py-1 rounded bg-indigo-900/60 hover:bg-indigo-800 text-[10px] font-mono font-bold text-indigo-200 border border-indigo-700"
                          >
                            11-0626-11_20.02
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setTestPartNumber('20.02');
                              setTestScanCode('20.02');
                            }}
                            className="px-2 py-1 rounded bg-indigo-900/60 hover:bg-indigo-800 text-[10px] font-mono font-bold text-indigo-200 border border-indigo-700"
                          >
                            20.02
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setTestOrderNumber('00-0000-00');
                              setTestPartNumber('00.00');
                              setTestScanCode('00-0000-00_00.00');
                            }}
                            className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-[10px] font-mono font-bold text-slate-300 border border-slate-700"
                          >
                            00-0000-00_00.00
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setTestOrderNumber('0000-0000');
                              setTestPartNumber('00.00.00');
                              setTestScanCode('0000-0000_00.00.00');
                            }}
                            className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-[10px] font-mono font-bold text-slate-300 border border-slate-700"
                          >
                            0000-0000_00.00.00
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setTestPartNumber('00.00');
                              setTestScanCode('00.00');
                            }}
                            className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-[10px] font-mono font-bold text-slate-300 border border-slate-700"
                          >
                            00.00
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
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

      {/* TAB 3: WAREHOUSE STORAGE CELLS */}
      {activeTab === 'warehouse_cells' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-bold text-slate-900 text-base">
                    Справочник уникальной фурнитуры и ячейки хранения на складе
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Адресное хранение. Укажите стеллаж, ящик или ячейку для позиций фурнитуры. На участке комплектовки сотрудник увидит точную подсказку 📍, где лежит деталь.
                </p>
              </div>

              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5 cursor-pointer shrink-0 self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Добавить номенклатуру</span>
              </button>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Всего наименований в базе</div>
                <div className="text-xl font-black text-slate-900 font-mono mt-0.5">
                  {aggregatedWarehouseItems.length} <span className="text-xs font-normal text-slate-500">поз.</span>
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200/80">
                <div className="text-[10px] font-bold text-emerald-800 uppercase">Закреплено за ячейками</div>
                <div className="text-xl font-black text-emerald-950 font-mono mt-0.5">
                  {aggregatedWarehouseItems.filter(i => !!i.storageCell).length} <span className="text-xs font-normal text-emerald-700">поз.</span>
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80">
                <div className="text-[10px] font-bold text-amber-800 uppercase">Без ячейки (требуют указания)</div>
                <div className="text-xl font-black text-amber-950 font-mono mt-0.5">
                  {aggregatedWarehouseItems.filter(i => !i.storageCell).length} <span className="text-xs font-normal text-amber-700">поз.</span>
                </div>
              </div>
            </div>

            {/* Add New Item Modal (Catalog & Manual Picker) */}
            <WarehouseCatalogPickerModal
              isOpen={showAddForm}
              catalogProducts={catalogProducts}
              warehouseLocations={formData.warehouseLocations || {}}
              onClose={() => setShowAddForm(false)}
              onAssignItemCell={(itemName, article, category, cell) => {
                const itemKey = `${article || ''}:::${itemName.toLowerCase().trim()}`;
                handleUpdateItemCell(itemKey, itemName, article, category, cell);
              }}
            />

            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={cellSearch}
                  onChange={(e) => setCellSearch(e.target.value)}
                  placeholder="Поиск номенклатуры по названию, артикулу или ячейке (A-12)..."
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-800 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <select
                value={cellCategoryFilter}
                onChange={(e) => setCellCategoryFilter(e.target.value)}
                className="px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-800 text-xs focus:ring-2 focus:ring-emerald-500 outline-none sm:w-60"
              >
                <option value="all">Все категории ({aggregatedWarehouseItems.length})</option>
                <option value="unassigned">⚠️ Без назначенной ячейки</option>
                <option value="Петли и доводчики">Петли и доводчики</option>
                <option value="Направляющие и ящики">Направляющие и ящики</option>
                <option value="Подъемные механизмы">Подъемные механизмы</option>
                <option value="Крепеж и метизы">Крепеж и метизы</option>
                <option value="Ручки и крючки">Ручки и крючки</option>
                <option value="Опоры и стяжки">Опоры и стяжки</option>
                <option value="Разное / Крепеж">Разное / Крепеж</option>
              </select>
            </div>

            {/* Items Table */}
            <div className="border border-slate-200/90 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-bold text-[10px] uppercase">
                      <th className="py-3 px-4 w-12 text-center">№</th>
                      <th className="py-3 px-4">Номенклатура / Категория</th>
                      <th className="py-3 px-4 w-36">Артикул</th>
                      <th className="py-3 px-4 w-60">Ячейка хранения склада 📍</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {aggregatedWarehouseItems.filter(item => {
                      const matchesCategory = cellCategoryFilter === 'all' 
                        || (cellCategoryFilter === 'unassigned' && !item.storageCell)
                        || item.category === cellCategoryFilter;
                      
                      const query = cellSearch.toLowerCase().trim();
                      const matchesSearch = !query 
                        || item.name.toLowerCase().includes(query)
                        || (item.article && item.article.toLowerCase().includes(query))
                        || (item.storageCell && item.storageCell.toLowerCase().includes(query));

                      return matchesCategory && matchesSearch;
                    }).map((item, idx) => {
                      const itemKey = `${item.article || ''}:::${item.name.toLowerCase().trim()}`;
                      
                      return (
                        <tr key={item.id || idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-slate-400 text-center text-[11px]">
                            {idx + 1}
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900 text-xs">{item.name}</div>
                            <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                              {item.category || 'Разное / Крепеж'}
                            </div>
                          </td>

                          <td className="py-3 px-4 font-mono font-bold text-slate-700">
                            {item.article ? (
                              <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                                {item.article}
                              </span>
                            ) : (
                              <span className="text-slate-300 font-normal italic">—</span>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            <div className="relative flex items-center gap-1.5">
                              <MapPin className={`w-4 h-4 shrink-0 ${item.storageCell ? 'text-emerald-600' : 'text-slate-300'}`} />
                              <input
                                type="text"
                                value={item.storageCell}
                                onChange={(e) => {
                                  handleUpdateItemCell(
                                    itemKey,
                                    item.name,
                                    item.article,
                                    item.category,
                                    e.target.value
                                  );
                                }}
                                placeholder="например: A-12"
                                className={`w-full px-3 py-1.5 rounded-xl border font-mono font-black text-xs uppercase outline-none focus:ring-2 focus:ring-emerald-500 transition-all ${
                                  item.storageCell 
                                    ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 font-bold' 
                                    : 'bg-white border-slate-200 text-slate-800'
                                }`}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: NOTE RULES */}
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
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Контроль качества ОТК (₽ за заказ)
                </label>
                <input
                  type="number"
                  value={formData.qcRatePerOrder || 150}
                  onChange={(e) => setFormData({ ...formData, qcRatePerOrder: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 font-black text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-orange-600" />
                  Упаковка заказа (₽ за заказ)
                </label>
                <input
                  type="number"
                  value={formData.packingRatePerOrder || 150}
                  onChange={(e) => setFormData({ ...formData, packingRatePerOrder: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 font-black text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-600" />
                  Комплектация фурнитуры (₽ за заказ)
                </label>
                <input
                  type="number"
                  value={formData.kittingRatePerOrder || 200}
                  onChange={(e) => setFormData({ ...formData, kittingRatePerOrder: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 font-black text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-2">
                  <Factory className="w-4 h-4 text-violet-600" />
                  Отгрузка со склада (₽ за факт)
                </label>
                <input
                  type="number"
                  value={formData.shippingRatePerFact || 300}
                  onChange={(e) => setFormData({ ...formData, shippingRatePerFact: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 font-black text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-amber-600" />
                  Фасады (₽ за м²)
                </label>
                <input
                  type="number"
                  value={formData.facadesRatePerM2 || 150}
                  onChange={(e) => setFormData({ ...formData, facadesRatePerM2: Number(e.target.value) })}
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

            {/* Nesting Drilling Mode Setting */}
            <div className="p-4 bg-gradient-to-r from-slate-50 to-blue-50/40 rounded-2xl border border-slate-200/80 mb-6 space-y-2">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <label htmlFor="useNestingPrisadkaToggle" className="font-bold text-sm text-slate-900 flex items-center gap-2 cursor-pointer">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                    Использовать нестинг (присадка в пласть выполняется на этапе распила)
                  </label>
                  <p className="text-xs text-slate-500 leading-relaxed max-w-3xl">
                    <strong className="text-slate-700">Включено (по умолчанию):</strong> Нестинг-центр при раскрое делает отверстия в пласть. Детали без торцевых отверстий (<code className="px-1 py-0.5 rounded bg-slate-200/80 font-mono text-[11px]">торец = 0</code>) считаются полностью готовыми после кромления и <strong className="text-emerald-700">не выводятся на участок присадки</strong>.
                    <br />
                    <strong className="text-slate-700">Отключено (пилим без нестинга):</strong> На этап присадки выводятся все детали, содержащие отверстия в пласть, даже если у них <code className="px-1 py-0.5 rounded bg-slate-200/80 font-mono text-[11px]">торец = 0</code>.
                  </p>
                </div>
                <input
                  id="useNestingPrisadkaToggle"
                  type="checkbox"
                  checked={formData.useNestingPrisadkaOnCutting !== false}
                  onChange={(e) => setFormData({ ...formData, useNestingPrisadkaOnCutting: e.target.checked })}
                  className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 border-slate-300 mt-1 cursor-pointer shrink-0"
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

      {/* TAB: BITRIX24 & DELIVERY ACT SETTINGS */}
      {activeTab === 'bitrix_delivery' && (
        <div className="space-y-6">
          {/* Bitrix24 Stage Mapping Configuration */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
                  <Workflow className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Сопоставление стадий производства с Битрикс24 CRM</h3>
                  <p className="text-xs text-slate-500">
                    При завершении участков в цехе или сканировании последней детали ERP автоматически переводит сделку в Битрикс24 на соответствующую стадию
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setManualStageInputMode(!manualStageInputMode)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    manualStageInputMode 
                      ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {manualStageInputMode ? <Edit3 className="w-3.5 h-3.5" /> : <ListFilter className="w-3.5 h-3.5" />}
                  {manualStageInputMode ? 'Режим: Ручной ввод ID' : 'Режим: Выбор из списка'}
                </button>
              </div>
            </div>

            {/* Webhook & Stage Loader Control Card */}
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3.5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex-1 space-y-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Входящий вебхук Битрикс24:
                  </label>
                  <div className="relative flex items-center">
                    <Link2 className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="https://your-domain.bitrix24.ru/rest/1/webhook-key/"
                      value={formData.bitrix24WebhookUrl || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData(prev => ({ ...prev, bitrix24WebhookUrl: val }));
                      }}
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-mono font-medium text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex items-end gap-2">
                  {b24Categories.length > 1 && (
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-700">
                        Воронка CRM:
                      </label>
                      <select
                        value={selectedB24Category}
                        onChange={(e) => setSelectedB24Category(e.target.value)}
                        className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="all">Все направления ({b24Stages.length})</option>
                        {b24Categories.map(cat => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name} (ID: {cat.id})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => loadBitrix24Data(formData.bitrix24WebhookUrl)}
                    disabled={isFetchingB24Stages}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 shrink-0"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isFetchingB24Stages ? 'animate-spin' : ''}`} />
                    {isFetchingB24Stages ? 'Загрузка...' : 'Обновить стадии из Б24'}
                  </button>
                </div>
              </div>

              {/* Status Message */}
              {b24FetchStatus && (
                <div className={`p-2.5 rounded-xl text-xs font-medium flex items-center gap-2 ${
                  b24Stages.length > 0 
                    ? 'bg-emerald-50 border border-emerald-200/80 text-emerald-800'
                    : 'bg-amber-50 border border-amber-200/80 text-amber-800'
                }`}>
                  {b24Stages.length > 0 ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  )}
                  <span>{b24FetchStatus}</span>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="text-xs font-bold text-slate-700">
                {manualStageInputMode 
                  ? 'Введите ID стадий сделок Битрикс24 для каждого участка (например: C1:PREPARATION, C1:EXECUTING, WON, C1:FINAL_INVOICE):'
                  : 'Выберите стадию сделки Битрикс24 из списка загруженных для каждого производственного участка:'}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {[
                  { id: 'queue', name: 'Очередь / Планирование', icon: Clock, badgeBg: 'bg-slate-100 text-slate-700' },
                  { id: 'cutting', name: 'Раскрой (ЛДСП/МДФ)', icon: Scissors, badgeBg: 'bg-blue-50 text-blue-700' },
                  { id: 'edging', name: 'Кромкооблицовка', icon: Layers, badgeBg: 'bg-indigo-50 text-indigo-700' },
                  { id: 'cnc', name: 'Присадка / ЧПУ', icon: Factory, badgeBg: 'bg-purple-50 text-purple-700' },
                  { id: 'facades', name: 'Фасады и МДФ', icon: Wrench, badgeBg: 'bg-amber-50 text-amber-700' },
                  { id: 'assembly', name: 'Сборка корпусов', icon: Wrench, badgeBg: 'bg-teal-50 text-teal-700' },
                  { id: 'kitting', name: 'Комплектовка фурнитуры', icon: Box, badgeBg: 'bg-cyan-50 text-cyan-700' },
                  { id: 'qc', name: 'Контроль ОТК', icon: CheckCircle2, badgeBg: 'bg-emerald-50 text-emerald-700' },
                  { id: 'packing', name: 'Упаковка и склад мест', icon: Package, badgeBg: 'bg-orange-50 text-orange-700' },
                  { id: 'ready', name: 'Готово / Завершено (Отгрузка)', icon: CheckCircle2, badgeBg: 'bg-green-50 text-green-700' },
                ].map(stageItem => {
                  const Icon = stageItem.icon;
                  const currentVal = formData.bitrix24StageMapping?.[stageItem.id] || '';
                  const showDropdown = !manualStageInputMode && (b24Stages.length > 0 || isFetchingB24Stages);

                  return (
                    <div key={stageItem.id} className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg ${stageItem.badgeBg}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-xs text-slate-800">{stageItem.name}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-500 shrink-0 font-medium">Стадия Б24:</span>
                        
                        {showDropdown ? (
                          <select
                            value={currentVal}
                            onChange={(e) => {
                              const val = e.target.value;
                              setFormData(prev => ({
                                ...prev,
                                bitrix24StageMapping: {
                                  ...(prev.bitrix24StageMapping || {}),
                                  [stageItem.id]: val
                                }
                              }));
                            }}
                            className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs cursor-pointer truncate"
                          >
                            <option value="">-- Не менять стадию в Б24 --</option>
                            {currentVal && !filteredB24Stages.some(s => s.id === currentVal) && (
                              <option value={currentVal}>⚠️ {currentVal} (текущая)</option>
                            )}
                            {filteredB24Stages.map(st => (
                              <option key={`${st.categoryId}-${st.id}`} value={st.id}>
                                {st.name} [{st.id}] {b24Categories.length > 2 && st.categoryName ? `— ${st.categoryName}` : ''}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            placeholder="STAGE_ID (e.g. C1:EXECUTING)"
                            value={currentVal}
                            onChange={(e) => {
                              const val = e.target.value;
                              setFormData(prev => ({
                                ...prev,
                                bitrix24StageMapping: {
                                  ...(prev.bitrix24StageMapping || {}),
                                  [stageItem.id]: val
                                }
                              }));
                            }}
                            className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-mono font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action on returning order from archive */}
              <div className="mt-4 p-4 bg-amber-50/70 border border-amber-200/80 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                  <RotateCcw className="w-4 h-4 text-amber-700" />
                  Действие при возврате заказа из архива в производство
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <label className="flex items-center gap-2.5 p-2.5 bg-white rounded-xl border border-amber-200/70 cursor-pointer">
                    <input
                      type="radio"
                      name="bitrix24RestoreAction"
                      value="do_nothing"
                      checked={(formData.bitrix24RestoreAction || 'do_nothing') === 'do_nothing'}
                      onChange={() => setFormData({ ...formData, bitrix24RestoreAction: 'do_nothing' })}
                      className="text-amber-600 focus:ring-amber-500 cursor-pointer"
                    />
                    <span className="font-medium text-slate-800">Не менять стадию в Битрикс24</span>
                  </label>
                  <label className="flex items-center gap-2.5 p-2.5 bg-white rounded-xl border border-amber-200/70 cursor-pointer">
                    <input
                      type="radio"
                      name="bitrix24RestoreAction"
                      value="restore_to_stage"
                      checked={formData.bitrix24RestoreAction === 'restore_to_stage'}
                      onChange={() => setFormData({ ...formData, bitrix24RestoreAction: 'restore_to_stage' })}
                      className="text-amber-600 focus:ring-amber-500 cursor-pointer"
                    />
                    <span className="font-medium text-slate-800">Перевести на указанную стадию</span>
                  </label>
                </div>

                {formData.bitrix24RestoreAction === 'restore_to_stage' && (
                  <div className="pt-2">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Стадия Битрикс24 для возврата в работу:</label>
                    {!manualStageInputMode && (b24Stages.length > 0 || isFetchingB24Stages) ? (
                      <select
                        value={formData.bitrix24RestoreStageId || ''}
                        onChange={(e) => setFormData({ ...formData, bitrix24RestoreStageId: e.target.value })}
                        className="w-full px-3.5 py-2 rounded-xl bg-white border border-amber-300 font-bold text-xs text-slate-900 outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer truncate"
                      >
                        <option value="">-- Выберите стадию Битрикс24 --</option>
                        {formData.bitrix24RestoreStageId && !filteredB24Stages.some(s => s.id === formData.bitrix24RestoreStageId) && (
                          <option value={formData.bitrix24RestoreStageId}>⚠️ {formData.bitrix24RestoreStageId} (текущая)</option>
                        )}
                        {filteredB24Stages.map(st => (
                          <option key={`restore-${st.categoryId}-${st.id}`} value={st.id}>
                            {st.name} [{st.id}] {b24Categories.length > 2 && st.categoryName ? `— ${st.categoryName}` : ''}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        placeholder="Например: C1:PREPARATION или C1:EXECUTING"
                        value={formData.bitrix24RestoreStageId || ''}
                        onChange={(e) => setFormData({ ...formData, bitrix24RestoreStageId: e.target.value })}
                        className="w-full px-3.5 py-2 rounded-xl bg-white border border-amber-300 font-mono font-bold text-xs text-slate-900 outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Autoclose Tasks Settings Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Автоматическое закрытие задач в Битрикс24</h3>
                  <p className="text-xs text-slate-500">
                    Автоматически закрывать задачи сделки и менять ответственного при завершении этапов производства в ERP
                  </p>
                </div>
              </div>

              {/* Toggle Switch */}
              <button
                type="button"
                onClick={() => setFormData({
                  ...formData,
                  bitrix24TaskClosureEnabled: !formData.bitrix24TaskClosureEnabled
                })}
                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  formData.bitrix24TaskClosureEnabled ? 'bg-blue-600' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    formData.bitrix24TaskClosureEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Instruction Guide */}
            <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-2xl space-y-3.5">
              <div className="flex items-center gap-2 text-xs font-black text-slate-800 uppercase tracking-wider">
                <Info className="w-4 h-4 text-blue-600" />
                Инструкция по настройке и использованию
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="space-y-3">
                  <div className="flex gap-2.5">
                    <div className="flex items-center justify-center w-5 h-5 rounded-lg bg-blue-100 font-bold text-[10px] text-blue-700 shrink-0">1</div>
                    <p className="text-slate-600 font-medium">
                      <strong className="text-slate-800 font-bold">Свяжите сотрудников:</strong> Перейдите в раздел <strong className="text-slate-800 font-bold">«Сотрудники»</strong> и для каждого мастера укажите его числовой <strong className="text-blue-700 font-bold">ID пользователя в Битрикс24</strong>. Это позволит назначать закрытые задачи лично на них для зачета KPI.
                    </p>
                  </div>

                  <div className="flex gap-2.5">
                    <div className="flex items-center justify-center w-5 h-5 rounded-lg bg-blue-100 font-bold text-[10px] text-blue-700 shrink-0">2</div>
                    <p className="text-slate-600 font-medium">
                      <strong className="text-slate-800 font-bold">Авто-комментарий:</strong> При закрытии задачи ERP сама добавит в задачу комментарий с именем мастера, временем завершения и списком готовых деталей.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex gap-2.5">
                    <div className="flex items-center justify-center w-5 h-5 rounded-lg bg-blue-100 font-bold text-[10px] text-blue-700 shrink-0">3</div>
                    <div className="text-slate-600 font-medium">
                      <strong className="text-slate-800 font-bold">Как робот ищет задачу в сделке?</strong> 
                      <p className="mt-1">Для сопоставления используется имя задачи или тег в Битрикс24:</p>
                      <ul className="list-disc pl-4 mt-1 space-y-1 font-semibold text-slate-700">
                        <li><strong className="text-slate-800">Распил:</strong> теги <code className="bg-white px-1 py-0.5 rounded border border-slate-200">cutting</code>, <code className="bg-white px-1 py-0.5 rounded border border-slate-200">распил</code> или слово <code className="text-blue-700 font-bold">"распил"</code> в названии.</li>
                        <li><strong className="text-slate-800">Кромка:</strong> теги <code className="bg-white px-1 py-0.5 rounded border border-slate-200">edging</code>, <code className="bg-white px-1 py-0.5 rounded border border-slate-200">кромка</code> или слово <code className="text-blue-700 font-bold">"кромка"</code> в названии.</li>
                        <li><strong className="text-slate-800">Сборка:</strong> теги <code className="bg-white px-1 py-0.5 rounded border border-slate-200">assembly</code>, <code className="bg-white px-1 py-0.5 rounded border border-slate-200">сборка</code> или слово <code className="text-blue-700 font-bold">"сборка"</code> в названии.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2 text-[10.5px] text-slate-500 font-medium flex items-center gap-1.5 border-t border-slate-200/60">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                В случае отключения опции сделки будут по-прежнему менять стадии в CRM, но задачи внутри сделок затрагиваться не будут.
              </div>
            </div>
          </div>

          {/* Bitrix24 Custom Fields Mapping */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Truck className="w-5 h-5 text-violet-600" />
              <div>
                <h3 className="font-bold text-slate-900 text-base">Идентификаторы полей Битрикс24 (Доставка и клиент)</h3>
                <p className="text-xs text-slate-500">
                  Укажите названия пользовательских полей сделки из Битрикс24 (например: UF_CRM_DELIVERY_ADDRESS)
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Поле "Адрес доставки"</label>
                <input
                  type="text"
                  placeholder="UF_CRM_DELIVERY_ADDRESS"
                  value={formData.bitrix24FieldMapping?.deliveryAddressField || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    bitrix24FieldMapping: { ...(formData.bitrix24FieldMapping || {}), deliveryAddressField: e.target.value }
                  })}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 font-mono font-bold text-slate-900 outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Поле "ФИО Заказчика"</label>
                <input
                  type="text"
                  placeholder="UF_CRM_CLIENT_NAME"
                  value={formData.bitrix24FieldMapping?.clientNameField || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    bitrix24FieldMapping: { ...(formData.bitrix24FieldMapping || {}), clientNameField: e.target.value }
                  })}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 font-mono font-bold text-slate-900 outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Поле "Телефон клиента"</label>
                <input
                  type="text"
                  placeholder="UF_CRM_CLIENT_PHONE"
                  value={formData.bitrix24FieldMapping?.clientPhoneField || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    bitrix24FieldMapping: { ...(formData.bitrix24FieldMapping || {}), clientPhoneField: e.target.value }
                  })}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 font-mono font-bold text-slate-900 outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Поле "Этаж"</label>
                <input
                  type="text"
                  placeholder="UF_CRM_FLOOR"
                  value={formData.bitrix24FieldMapping?.floorField || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    bitrix24FieldMapping: { ...(formData.bitrix24FieldMapping || {}), floorField: e.target.value }
                  })}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 font-mono font-bold text-slate-900 outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Поле "Наличие лифта"</label>
                <input
                  type="text"
                  placeholder="UF_CRM_ELEVATOR"
                  value={formData.bitrix24FieldMapping?.elevatorField || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    bitrix24FieldMapping: { ...(formData.bitrix24FieldMapping || {}), elevatorField: e.target.value }
                  })}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 font-mono font-bold text-slate-900 outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Поле "Стоимость доставки (₽)"</label>
                <input
                  type="text"
                  placeholder="UF_CRM_DELIVERY_PRICE"
                  value={formData.bitrix24FieldMapping?.deliveryPriceField || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    bitrix24FieldMapping: { ...(formData.bitrix24FieldMapping || {}), deliveryPriceField: e.target.value }
                  })}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 font-mono font-bold text-slate-900 outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Поле "Стоимость сборки (₽)"</label>
                <input
                  type="text"
                  placeholder="UF_CRM_ASSEMBLY_PRICE"
                  value={formData.bitrix24FieldMapping?.assemblyPriceField || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    bitrix24FieldMapping: { ...(formData.bitrix24FieldMapping || {}), assemblyPriceField: e.target.value }
                  })}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 font-mono font-bold text-slate-900 outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Поле "Комментарий по доставке"</label>
                <input
                  type="text"
                  placeholder="UF_CRM_DELIVERY_COMMENT"
                  value={formData.bitrix24FieldMapping?.deliveryCommentField || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    bitrix24FieldMapping: { ...(formData.bitrix24FieldMapping || {}), deliveryCommentField: e.target.value }
                  })}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 font-mono font-bold text-slate-900 outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
            </div>
          </div>

          {/* Printable A4 Shipping Act Template */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Printer className="w-5 h-5 text-indigo-600" />
              <div>
                <h3 className="font-bold text-slate-900 text-base">Шаблон Акта приема-передачи и ТТН (Печатная форма А4)</h3>
                <p className="text-xs text-slate-500">Настройки текста, шапки и QR-кода для печатного документа</p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Название компании в шапке</label>
                  <input
                    type="text"
                    value={formData.shippingActTemplate?.companyTitle || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      shippingActTemplate: { ...(formData.shippingActTemplate || {}), companyTitle: e.target.value }
                    })}
                    placeholder="ООО 'Мебельная фабрика'"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 font-bold text-slate-900 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">ИНН / ОГРН</label>
                  <input
                    type="text"
                    value={formData.shippingActTemplate?.companyInn || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      shippingActTemplate: { ...(formData.shippingActTemplate || {}), companyInn: e.target.value }
                    })}
                    placeholder="7700000000 / 1234567890123"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 font-bold text-slate-900 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Телефон диспетчерской</label>
                  <input
                    type="text"
                    value={formData.shippingActTemplate?.companyPhone || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      shippingActTemplate: { ...(formData.shippingActTemplate || {}), companyPhone: e.target.value }
                    })}
                    placeholder="+7 (495) 000-00-00"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 font-bold text-slate-900 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Заголовок Акта приема-передачи</label>
                <input
                  type="text"
                  value={formData.shippingActTemplate?.actHeaderTitle || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    shippingActTemplate: { ...(formData.shippingActTemplate || {}), actHeaderTitle: e.target.value }
                  })}
                  placeholder="АКТ ПРИЕМА-ПЕРЕДАЧИ ТОВАРА И КОМПЛЕКТАЦИИ"
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 font-bold text-slate-900 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Текст условий приемки и гарантии в Акте</label>
                <textarea
                  rows={3}
                  value={formData.shippingActTemplate?.actTermsText || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    shippingActTemplate: { ...(formData.shippingActTemplate || {}), actTermsText: e.target.value }
                  })}
                  placeholder="Заказчик подтверждает, что доставленные упаковки осмотрены..."
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 font-medium text-slate-900 outline-none resize-none"
                />
              </div>

              <div className="p-3 bg-violet-50/70 border border-violet-200 rounded-2xl flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900">Выводить QR-код для сборщика мебели</div>
                  <div className="text-[11px] text-slate-500">
                    Печатает на акте QR-код, сканируя который сборщик может открыть проект, схемы и детали
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={formData.shippingActTemplate?.showQrForAssembler !== false}
                  onChange={(e) => setFormData({
                    ...formData,
                    shippingActTemplate: { ...(formData.shippingActTemplate || {}), showQrForAssembler: e.target.checked }
                  })}
                  className="w-5 h-5 rounded text-violet-600 border-slate-300 focus:ring-violet-500 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Voice Alert Duration Settings */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-3">
            <h3 className="font-bold text-slate-900 text-base">Уведомление "Готовая деталь" на кромлении</h3>
            <p className="text-xs text-slate-500">
              Если деталь на этапе кромления не требует присадки, сотруднику выводится всплывающее сообщение и воспроизводится голос "Готовая деталь".
            </p>
            <div className="max-w-xs">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Время автоскрытия сообщения (секунд)
              </label>
              <input
                type="number"
                min={1}
                max={30}
                value={formData.finishedPartNoticeDuration || 3}
                onChange={(e) => setFormData({ ...formData, finishedPartNoticeDuration: Number(e.target.value) || 3 })}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 font-mono font-bold text-slate-900 text-xs focus:ring-2 focus:ring-violet-500 outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB: SHIFTS & ACCESS CONTROL (RBAC) */}
      {activeTab === 'shifts' && (
        <div className="space-y-6">
          {/* Work Hours and Timing */}
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

          {/* GRANULAR RBAC ACCESS CONTROL */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-6">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-base">Права доступа сотрудников к разделам ERP</h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Начальник цеха имеет полный доступ ко всем разделам. Здесь вы можете гибко настроить, какие модули и функции доступны обычным сотрудникам и мастерам.
              </p>
            </div>

            <div className="space-y-4">
              {/* 1. Dashboard */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      <LayoutDashboard className="w-4 h-4 text-blue-600" /> Раздел «Дашборд»
                    </div>
                    <div className="text-[11px] text-slate-500">Сводные показатели, загрузка цеха и активные заказы</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={formData.dashboardAccessMode || 'all'}
                      onChange={(e) => setFormData({ ...formData, dashboardAccessMode: e.target.value as any })}
                      className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="all">Доступно всем сотрудникам</option>
                      <option value="none">Только начальнику цеха</option>
                      <option value="custom">Выбранным сотрудникам</option>
                    </select>
                  </div>
                </div>

                {formData.dashboardAccessMode === 'custom' && employees.length > 0 && (
                  <div className="pt-2 border-t border-slate-200/60">
                    <div className="text-[11px] font-bold text-slate-700 mb-2">Выберите сотрудников, которым разрешен Дашборд:</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {employees.map(emp => {
                        const isChecked = (formData.dashboardAllowedEmployeeIds || []).includes(emp.id);
                        return (
                          <label key={emp.id} className="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-200 cursor-pointer text-xs">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const current = formData.dashboardAllowedEmployeeIds || [];
                                const updated = e.target.checked ? [...current, emp.id] : current.filter(id => id !== emp.id);
                                setFormData({ ...formData, dashboardAllowedEmployeeIds: updated });
                              }}
                              className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                            />
                            <span className="truncate font-medium text-slate-800">{emp.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Planning */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-purple-600" /> Раздел «Планирование»
                    </div>
                    <div className="text-[11px] text-slate-500">Загрузка файлов раскроя, бирок, фурнитуры и запуск в работу</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={formData.planningSectionEnabled === false ? 'none' : (formData.planningAllowedEmployeeIds && formData.planningAllowedEmployeeIds.length > 0 ? 'custom' : 'all')}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === 'none') {
                          setFormData({ ...formData, planningSectionEnabled: false, planningAllowedEmployeeIds: [] });
                        } else if (val === 'all') {
                          setFormData({ ...formData, planningSectionEnabled: true, planningAllowedEmployeeIds: [] });
                        } else {
                          setFormData({ ...formData, planningSectionEnabled: false, planningAllowedEmployeeIds: formData.planningAllowedEmployeeIds || [] });
                        }
                      }}
                      className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
                    >
                      <option value="all">Доступно всем сотрудникам</option>
                      <option value="none">Только начальнику цеха</option>
                      <option value="custom">Выбранным сотрудникам</option>
                    </select>
                  </div>
                </div>

                {formData.planningSectionEnabled === false && (
                  <div className="pt-2 border-t border-slate-200/60">
                    <div className="text-[11px] font-bold text-slate-700 mb-2">Разрешить доступ к планированию отдельным сотрудникам (например, технологу):</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {employees.map(emp => {
                        const isChecked = (formData.planningAllowedEmployeeIds || []).includes(emp.id);
                        return (
                          <label key={emp.id} className="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-200 cursor-pointer text-xs">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const current = formData.planningAllowedEmployeeIds || [];
                                const updated = e.target.checked ? [...current, emp.id] : current.filter(id => id !== emp.id);
                                setFormData({ ...formData, planningAllowedEmployeeIds: updated });
                              }}
                              className="w-4 h-4 text-purple-600 rounded cursor-pointer"
                            />
                            <span className="truncate font-medium text-slate-800">{emp.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Schedule */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                <div>
                  <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <CalendarDays className="w-4 h-4 text-emerald-600" /> Раздел «График работы»
                  </div>
                  <div className="text-[11px] text-slate-500">Управление сменностью, табель выходов и планирование графика</div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                  <label className="flex items-start gap-2.5 p-3 bg-white rounded-xl border border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.scheduleSectionEnabled !== false}
                      onChange={(e) => setFormData({ ...formData, scheduleSectionEnabled: e.target.checked })}
                      className="mt-0.5 w-4 h-4 text-emerald-600 rounded cursor-pointer"
                    />
                    <div>
                      <span className="block font-bold text-xs text-slate-900">Показывать раздел</span>
                      <span className="block text-[10px] text-slate-400">Вкладка видна в меню</span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-3 bg-white rounded-xl border border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.scheduleShowOtherEmployees !== false}
                      onChange={(e) => setFormData({ ...formData, scheduleShowOtherEmployees: e.target.checked })}
                      className="mt-0.5 w-4 h-4 text-emerald-600 rounded cursor-pointer"
                    />
                    <div>
                      <span className="block font-bold text-xs text-slate-900">Показывать других мастеров</span>
                      <span className="block text-[10px] text-slate-400">Если выкл — видит только свои смены</span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-3 bg-white rounded-xl border border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.scheduleCanSelfEdit !== false}
                      onChange={(e) => setFormData({ ...formData, scheduleCanSelfEdit: e.target.checked })}
                      className="mt-0.5 w-4 h-4 text-emerald-600 rounded cursor-pointer"
                    />
                    <div>
                      <span className="block font-bold text-xs text-slate-900">Сам проставляет смены</span>
                      <span className="block text-[10px] text-slate-400">Может менять себе даты смен</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* 4. Production */}
              <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200/80 flex items-center justify-between">
                <div>
                  <div className="font-bold text-emerald-950 text-xs flex items-center gap-1.5">
                    <Factory className="w-4 h-4 text-emerald-700" /> Раздел «Производство» (Цех и сканирование)
                  </div>
                  <div className="text-[11px] text-emerald-800">Основной рабочий терминал станков и рабочих мест мастеров</div>
                </div>
                <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-bold text-[11px] rounded-xl border border-emerald-300">
                  Всегда доступно всем
                </span>
              </div>

              {/* 5. Warehouse Residuals */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-amber-600" /> Раздел «Склад остатков» (Деловые обрезки и кромка)
                  </div>
                  <div className="text-[11px] text-slate-500">Учет сохраненных обрезков ЛДСП/МДФ и остатков бухт кромки</div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.residualsSectionEnabled !== false}
                    onChange={(e) => setFormData({ ...formData, residualsSectionEnabled: e.target.checked })}
                    className="w-4 h-4 text-amber-600 rounded cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-800">Доступно сотрудникам</span>
                </label>
              </div>

              {/* 6. Orders Archive */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <Archive className="w-4 h-4 text-slate-600" /> Раздел «Архив заказов»
                  </div>
                  <div className="text-[11px] text-slate-500">Просмотр завершенных и отгруженных заказов производства</div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.archiveSectionEnabled !== false}
                    onChange={(e) => setFormData({ ...formData, archiveSectionEnabled: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-800">Доступно сотрудникам</span>
                </label>
              </div>

              {/* 7. Reports & Analytics */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      <BarChart3 className="w-4 h-4 text-blue-600" /> Раздел «Аналитика и отчеты»
                    </div>
                    <div className="text-[11px] text-slate-500">Графики выработки, статистика участков и производительность</div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.reportsSectionEnabled !== false}
                      onChange={(e) => setFormData({ ...formData, reportsSectionEnabled: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                    />
                    <span className="text-xs font-bold text-slate-800">Показывать раздел</span>
                  </label>
                </div>

                {formData.reportsSectionEnabled !== false && (
                  <div className="pt-2 border-t border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-xs font-medium text-slate-700">Объем аналитики для мастеров:</span>
                    <select
                      value={formData.reportsViewScope || 'all'}
                      onChange={(e) => setFormData({ ...formData, reportsViewScope: e.target.value as any })}
                      className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="all">По всему производству целиком</option>
                      <option value="own_only">Только личная выработка мастера (за себя)</option>
                    </select>
                  </div>
                )}
              </div>

              {/* 8. Salaries */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                <div>
                  <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-emerald-600" /> Раздел «Зарплаты и начисления»
                  </div>
                  <div className="text-[11px] text-slate-500">Сдельная оплата, премии, штрафы и ведомости выплат</div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  <label className="flex items-start gap-2.5 p-3 bg-white rounded-xl border border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.salariesSectionEnabled !== false}
                      onChange={(e) => setFormData({ ...formData, salariesSectionEnabled: e.target.checked })}
                      className="mt-0.5 w-4 h-4 text-emerald-600 rounded cursor-pointer"
                    />
                    <div>
                      <span className="block font-bold text-xs text-slate-900">Показывать раздел мастерам</span>
                      <span className="block text-[10px] text-slate-400">Вкладка зарплат доступна в меню</span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-3 bg-white rounded-xl border border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.seeOnlyOwnSalary !== false}
                      onChange={(e) => setFormData({ ...formData, seeOnlyOwnSalary: e.target.checked })}
                      className="mt-0.5 w-4 h-4 text-emerald-600 rounded cursor-pointer"
                    />
                    <div>
                      <span className="block font-bold text-xs text-slate-900">Видят только свою зарплату</span>
                      <span className="block text-[10px] text-slate-400">Мастер не видит начисления коллег</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* 9. Employees List */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-indigo-600" /> Раздел «Сотрудники»
                  </div>
                  <div className="text-[11px] text-slate-500">Список штата, участки работы и контакты сотрудников</div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.employeesSectionEnabled !== false}
                    onChange={(e) => setFormData({ ...formData, employeesSectionEnabled: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-800">Доступно сотрудникам</span>
                </label>
              </div>

              {/* 10. Settings */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <Settings className="w-4 h-4 text-slate-600" /> Раздел «Настройки»
                  </div>
                  <div className="text-[11px] text-slate-500">Конфигурация участков, интеграций и тарифов производства</div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.settingsSectionEnabled === true}
                    onChange={(e) => setFormData({ ...formData, settingsSectionEnabled: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-800">Разрешить доступ обычным сотрудникам</span>
                </label>
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

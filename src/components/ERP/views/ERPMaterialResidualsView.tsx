import React, { useState, useMemo } from 'react';
import { 
  Layers, 
  Search, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Filter, 
  Scissors, 
  Box, 
  MapPin, 
  Calendar, 
  User, 
  AlertTriangle,
  RotateCcw,
  Check,
  X,
  Sparkles,
  SunMedium,
  Grid,
  Columns,
  Maximize2,
  Tag,
  Palette,
  Lightbulb,
  PanelLeft,
  LayoutGrid
} from 'lucide-react';
import { MaterialResidual, ERPEmployee, ProductionOrder } from '../types';
import { EdgeDecorSelector } from '../components/EdgeDecorSelector';

interface ERPMaterialResidualsViewProps {
  residuals: MaterialResidual[];
  currentUser?: ERPEmployee | any | null;
  employees?: ERPEmployee[];
  orders?: ProductionOrder[];
  companyName?: string;
  catalogMaterials?: Record<string, string[]>;
  catalogProducts?: any[];
  onAddResidual: (item: MaterialResidual) => void;
  onUpdateResidual: (item: MaterialResidual) => void;
  onDeleteResidual: (id: string) => void;
}

const COUNTERTOP_BRANDS = [
  'Кедр',
  'Slotex (Слотекс)',
  'Egger (Эггер)',
  'Скиф',
  'Форма и Стиль (Forma&Style)',
  'Kronospan (Кроношпан)',
  'ARPA',
  'Duropal',
  'Грандекс (Grandex)',
  'Компакт-ламинат / HPL',
  'Другой бренд'
];

const PLINTH_TYPES = ['ПВХ', 'Металл (Алюминий/Сталь)', 'МДФ', 'ЛДСП'];

const LIGHT_PROFILE_TYPES = [
  'Врезной',
  'Накладной',
  'Угловой',
  'Скрытый / Теневой',
  'Подвесной'
];

const GOLA_TYPES = [
  'L (L-образный горизонтальный)',
  'C (C-образный горизонтальный)',
  'Оконечный (Вертикальный боковой)',
  'Срединный (Вертикальный межосевой)'
];

const POPULAR_COLORS = [
  'Черный матовый',
  'Анодированный алюминий / Серебро',
  'Белый матовый',
  'Графит / Антрацит',
  'Серый',
  'Хром глянец',
  'Шампань',
  'Золото',
  'Бронза',
  'В цвет корпуса'
];

export const ERPMaterialResidualsView: React.FC<ERPMaterialResidualsViewProps> = ({
  residuals,
  currentUser,
  employees = [],
  orders = [],
  companyName,
  catalogMaterials = {},
  catalogProducts = [],
  onAddResidual,
  onUpdateResidual,
  onDeleteResidual
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('available');

  // Modal state for manual creation
  const [showAddModal, setShowAddModal] = useState(false);
  const [formType, setFormType] = useState<MaterialResidual['type']>('offcut');
  
  // Default employee name from currentUser or list
  const defaultEmpName = 
    currentUser?.employeeName || 
    currentUser?.name || 
    currentUser?.displayName || 
    (employees.length > 0 ? employees[0].name : 'Мастер цеха');

  const [formEmployeeName, setFormEmployeeName] = useState<string>(defaultEmpName);

  // Form states for various types
  const [formCategory, setFormCategory] = useState<string>('ЛДСП');
  const [formMaterialName, setFormMaterialName] = useState('');
  const [formBrand, setFormBrand] = useState('Кедр');
  const [formCustomBrand, setFormCustomBrand] = useState('');
  const [formDecor, setFormDecor] = useState('');
  const [formColor, setFormColor] = useState('Черный матовый');
  const [formCustomColor, setFormCustomColor] = useState('');
  const [formPlinthType, setFormPlinthType] = useState('ПВХ');
  const [formPlinthHeightMm, setFormPlinthHeightMm] = useState('100');
  const [formLightProfileType, setFormLightProfileType] = useState('Врезной');
  const [formGolaType, setFormGolaType] = useState('L');
  const [formLengthMm, setFormLengthMm] = useState('');
  const [formWidthMm, setFormWidthMm] = useState('');
  const [formThicknessMm, setFormThicknessMm] = useState('16');
  const [formLengthMeters, setFormLengthMeters] = useState('');
  const [formQuantity, setFormQuantity] = useState('1');
  const [formStorageCell, setFormStorageCell] = useState('Стеллаж остатков');
  const [formNotes, setFormNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Dispose confirmation modal state
  const [disposingItem, setDisposingItem] = useState<MaterialResidual | null>(null);

  // Categories list for filter pills
  const categoriesList = [
    { id: 'all', name: 'Все материалы' },
    { id: 'ЛДСП', name: 'ЛДСП (Обрезки)' },
    { id: 'МДФ', name: 'МДФ (Обрезки)' },
    { id: 'Столешница', name: 'Столешницы' },
    { id: 'Стеновая панель', name: 'Стеновые панели' },
    { id: 'Цоколь', name: 'Цоколи' },
    { id: 'Профиль подсветки', name: 'Профили подсветки' },
    { id: 'Профиль GOLA', name: 'Профиль GOLA' },
    { id: 'Кромка', name: 'Кромка (Рулоны)' },
    { id: 'ХДФ', name: 'ХДФ / ДВП' },
    { id: 'Пластик', name: 'Пластик / Постформинг' },
    { id: 'Другое', name: 'Другое' }
  ];

  // Filtered residuals
  const filtered = useMemo(() => {
    return residuals.filter(r => {
      if (selectedStatus !== 'all' && r.status !== selectedStatus) return false;
      if (selectedCategory !== 'all' && r.category !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          r.materialName?.toLowerCase().includes(q) ||
          r.brand?.toLowerCase().includes(q) ||
          r.decor?.toLowerCase().includes(q) ||
          r.color?.toLowerCase().includes(q) ||
          r.addedByEmployeeName?.toLowerCase().includes(q) ||
          (r.orderNumber && r.orderNumber.toLowerCase().includes(q)) ||
          (r.storageCell && r.storageCell.toLowerCase().includes(q)) ||
          (r.notes && r.notes.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [residuals, selectedStatus, selectedCategory, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const available = residuals.filter(r => r.status === 'available');
    const offcutsAvailable = available.filter(r => r.type === 'offcut');
    const edgesAvailable = available.filter(r => r.type === 'edge');
    const countertopsAvailable = available.filter(r => r.type === 'countertop' || r.type === 'wall_panel');
    const profilesAvailable = available.filter(r => r.type === 'plinth' || r.type === 'light_profile' || r.type === 'gola_profile');

    const totalOffcutsM2 = offcutsAvailable.reduce((acc, curr) => acc + (curr.areaM2 || 0), 0);
    const totalEdgesMeters = edgesAvailable.reduce((acc, curr) => acc + (curr.lengthMeters || 0), 0);
    const totalProfilesMeters = profilesAvailable.reduce((acc, curr) => {
      if (curr.lengthMm) return acc + (curr.lengthMm * curr.quantity) / 1000;
      if (curr.lengthMeters) return acc + (curr.lengthMeters * curr.quantity);
      return acc;
    }, 0);

    return {
      totalCount: available.length,
      offcutsCount: offcutsAvailable.length,
      offcutsAreaM2: Number(totalOffcutsM2.toFixed(2)),
      edgesCount: edgesAvailable.length,
      edgesMeters: Number(totalEdgesMeters.toFixed(1)),
      countertopsCount: countertopsAvailable.length,
      profilesCount: profilesAvailable.length,
      profilesMeters: Number(totalProfilesMeters.toFixed(1)),
      disposedCount: residuals.filter(r => r.status === 'disposed').length,
      usedCount: residuals.filter(r => r.status === 'used').length
    };
  }, [residuals]);

  const handleOpenAddModal = (type: MaterialResidual['type'] = 'offcut') => {
    setFormType(type);
    setFormEmployeeName(defaultEmpName);
    setFormError(null);
    setShowAddModal(true);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const emp = formEmployeeName.trim() || defaultEmpName || 'Сотрудник цеха';
    if (!emp) {
      setFormError('Укажите ФИО сотрудника, внесшего остаток');
      return;
    }

    const qty = Number(formQuantity) || 1;
    let newResidual: MaterialResidual;

    if (formType === 'countertop' || formType === 'wall_panel') {
      const activeBrand = formBrand === 'Другой бренд' ? formCustomBrand.trim() : formBrand;
      const decor = formDecor.trim();
      if (!decor) {
        setFormError('Укажите декор (текстуру/цвет) материала');
        return;
      }
      const len = Number(formLengthMm);
      const wid = Number(formWidthMm);
      const thick = Number(formThicknessMm) || (formType === 'countertop' ? 38 : 6);

      if (!len || len <= 0 || !wid || wid <= 0) {
        setFormError('Укажите корректную длину и ширину (в мм)');
        return;
      }

      const isCountertop = formType === 'countertop';
      const categoryName = isCountertop ? 'Столешница' : 'Стеновая панель';
      const fullName = `${categoryName} ${activeBrand ? activeBrand + ' ' : ''}${decor}`;

      newResidual = {
        id: `res-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        type: formType,
        category: categoryName,
        materialName: fullName,
        brand: activeBrand,
        decor: decor,
        thicknessMm: thick,
        lengthMm: len,
        widthMm: wid,
        areaM2: Number(((len * wid * qty) / 1000000).toFixed(3)),
        quantity: qty,
        addedAt: new Date().toISOString(),
        addedByEmployeeName: emp,
        storageCell: formStorageCell.trim() || (isCountertop ? 'Стойка столешниц' : 'Стойка панелей'),
        notes: formNotes.trim(),
        status: 'available'
      };
    } else if (formType === 'plinth') {
      const colorVal = formColor === 'custom' ? formCustomColor.trim() : formColor;
      const len = Number(formLengthMm);
      const height = Number(formPlinthHeightMm) || 100;

      if (!len || len <= 0) {
        setFormError('Укажите корректную длину цоколя (в мм)');
        return;
      }

      const fullName = `Цоколь ${formPlinthType} ${colorVal ? colorVal + ' ' : ''}(H=${height}мм)`;

      newResidual = {
        id: `res-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        type: 'plinth',
        category: 'Цоколь',
        materialName: fullName,
        plinthType: formPlinthType,
        plinthHeightMm: height,
        heightMm: height,
        color: colorVal,
        lengthMm: len,
        lengthMeters: Number((len / 1000).toFixed(2)),
        quantity: qty,
        addedAt: new Date().toISOString(),
        addedByEmployeeName: emp,
        storageCell: formStorageCell.trim() || 'Стеллаж цоколей',
        notes: formNotes.trim(),
        status: 'available'
      };
    } else if (formType === 'light_profile') {
      const colorVal = formColor === 'custom' ? formCustomColor.trim() : formColor;
      const len = Number(formLengthMm);

      if (!len || len <= 0) {
        setFormError('Укажите корректную длину профиля подсветки (в мм)');
        return;
      }

      const fullName = `Профиль подсветки (${formLightProfileType}) ${colorVal ? colorVal : ''}`;

      newResidual = {
        id: `res-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        type: 'light_profile',
        category: 'Профиль подсветки',
        materialName: fullName,
        lightProfileType: formLightProfileType,
        color: colorVal,
        lengthMm: len,
        lengthMeters: Number((len / 1000).toFixed(2)),
        quantity: qty,
        addedAt: new Date().toISOString(),
        addedByEmployeeName: emp,
        storageCell: formStorageCell.trim() || 'Стойка профилей подсветки',
        notes: formNotes.trim(),
        status: 'available'
      };
    } else if (formType === 'gola_profile') {
      const colorVal = formColor === 'custom' ? formCustomColor.trim() : formColor;
      const len = Number(formLengthMm);

      if (!len || len <= 0) {
        setFormError('Укажите корректную длину профиля GOLA (в мм)');
        return;
      }

      const fullName = `Профиль GOLA (тип ${formGolaType}) ${colorVal ? colorVal : ''}`;

      newResidual = {
        id: `res-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        type: 'gola_profile',
        category: 'Профиль GOLA',
        materialName: fullName,
        golaType: formGolaType,
        color: colorVal,
        lengthMm: len,
        lengthMeters: Number((len / 1000).toFixed(2)),
        quantity: qty,
        addedAt: new Date().toISOString(),
        addedByEmployeeName: emp,
        storageCell: formStorageCell.trim() || 'Стойка профилей GOLA',
        notes: formNotes.trim(),
        status: 'available'
      };
    } else if (formType === 'edge') {
      const decor = formMaterialName.trim();
      if (!decor) {
        setFormError('Укажите декор кромки');
        return;
      }
      const lenM = Number(formLengthMeters) || 0;
      if (lenM <= 0) {
        setFormError('Укажите корректный остаток кромки в метрах');
        return;
      }

      const fullName = decor.toLowerCase().includes('кромка')
        ? decor
        : `Кромка ${formBrand !== 'Все бренды' && formBrand ? formBrand + ' ' : ''}${decor}`;

      newResidual = {
        id: `res-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        type: 'edge',
        category: 'Кромка',
        materialName: fullName,
        brand: formBrand,
        decor: decor,
        lengthMeters: lenM,
        quantity: qty,
        addedAt: new Date().toISOString(),
        addedByEmployeeName: emp,
        storageCell: formStorageCell.trim() || 'Стеллаж кромки',
        notes: formNotes.trim(),
        status: 'available'
      };
    } else {
      // Offcut (ЛДСП / МДФ / ХДФ / Пластик)
      const name = formMaterialName.trim();
      if (!name) {
        setFormError('Укажите наименование материала обрезка');
        return;
      }
      const len = Number(formLengthMm) || 0;
      const wid = Number(formWidthMm) || 0;
      const thick = Number(formThicknessMm) || 16;
      if (len <= 0 || wid <= 0) {
        setFormError('Укажите корректную длину и ширину (в мм)');
        return;
      }
      const areaM2 = Number(((len * wid * qty) / 1000000).toFixed(3));

      newResidual = {
        id: `res-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        type: 'offcut',
        category: formCategory,
        materialName: name,
        thicknessMm: thick,
        lengthMm: len,
        widthMm: wid,
        areaM2: areaM2,
        quantity: qty,
        addedAt: new Date().toISOString(),
        addedByEmployeeName: emp,
        storageCell: formStorageCell.trim() || 'Складирование обрезков',
        notes: formNotes.trim(),
        status: 'available'
      };
    }

    onAddResidual(newResidual);
    setShowAddModal(false);

    // Reset
    setFormMaterialName('');
    setFormDecor('');
    setFormLengthMm('');
    setFormWidthMm('');
    setFormLengthMeters('');
    setFormNotes('');
    setFormCustomBrand('');
    setFormCustomColor('');
  };

  const handleConfirmDispose = () => {
    if (!disposingItem) return;
    const emp = defaultEmpName || 'Сотрудник цеха';
    const updated: MaterialResidual = {
      ...disposingItem,
      status: 'disposed',
      disposedAt: new Date().toISOString(),
      disposedByEmployeeName: emp
    };
    onUpdateResidual(updated);
    setDisposingItem(null);
  };

  const handleMarkUsed = (item: MaterialResidual) => {
    const updated: MaterialResidual = {
      ...item,
      status: 'used'
    };
    onUpdateResidual(updated);
  };

  const handleRestoreAvailable = (item: MaterialResidual) => {
    const updated: MaterialResidual = {
      ...item,
      status: 'available'
    };
    onUpdateResidual(updated);
  };

  // Helper for badge color based on category
  const getCategoryBadgeClass = (category: string, type: string) => {
    switch (category) {
      case 'Столешница':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'Стеновая панель':
        return 'bg-teal-100 text-teal-900 border-teal-300';
      case 'Цоколь':
        return 'bg-zinc-200 text-zinc-900 border-zinc-300';
      case 'Профиль подсветки':
        return 'bg-yellow-100 text-yellow-900 border-yellow-300';
      case 'Профиль GOLA':
        return 'bg-purple-100 text-purple-900 border-purple-300';
      case 'Кромка':
        return 'bg-indigo-100 text-indigo-900 border-indigo-300';
      case 'МДФ':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300';
      case 'ХДФ':
        return 'bg-orange-100 text-orange-900 border-orange-300';
      case 'Пластик':
      case 'Постформинг':
        return 'bg-cyan-100 text-cyan-900 border-cyan-300';
      default:
        return 'bg-blue-100 text-blue-900 border-blue-300';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner & Action */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
            <Layers className="w-4 h-4 text-blue-600" /> Учет деловых остатков и утилизация
          </div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900">
            Остатки материалов цеха
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Единая база деловых остатков: обрезки плит (ЛДСП/МДФ), столешницы, стеновые панели, цоколи, профили подсветки, GOLA и кромка.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => handleOpenAddModal('offcut')}
            className="px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-200 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Внести остаток</span>
          </button>
        </div>
      </div>

      {/* Stats Summary Widgets */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Обрезки плит (ЛДСП/МДФ)</span>
            <Scissors className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {stats.offcutsAreaM2} <span className="text-sm font-bold text-slate-500">м²</span>
          </div>
          <div className="text-[11px] font-medium text-slate-500 mt-1">
            В наличии {stats.offcutsCount} деловых обрезков
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Столешницы и панели</span>
            <Maximize2 className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {stats.countertopsCount} <span className="text-sm font-bold text-slate-500">поз.</span>
          </div>
          <div className="text-[11px] font-medium text-slate-500 mt-1">
            Деловые отрезки столешниц и СП
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Цоколи и Профили</span>
            <Columns className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {stats.profilesMeters} <span className="text-sm font-bold text-slate-500">пог. м</span>
          </div>
          <div className="text-[11px] font-medium text-slate-500 mt-1">
            {stats.profilesCount} хлыстов (GOLA, Подсветка, ПВХ)
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Остатки кромки</span>
            <Layers className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {stats.edgesMeters} <span className="text-sm font-bold text-slate-500">пог. м</span>
          </div>
          <div className="text-[11px] font-medium text-slate-500 mt-1">
            В наличии {stats.edgesCount} рулонов
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs col-span-2 lg:col-span-1">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Использовано / Брак</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700">
            {stats.usedCount} <span className="text-xs font-bold text-slate-400">применено</span> / <span className="text-rose-600 text-xl">{stats.disposedCount}</span>
          </div>
          <div className="text-[11px] font-medium text-slate-500 mt-1">
            Утилизировано в брак: {stats.disposedCount}
          </div>
        </div>
      </div>

      {/* Toolbar: Search, Filters, Status tabs */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Поиск по названию, декору, бренду, ячейке, ФИО..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
          </div>

          {/* Status selector buttons */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl w-full md:w-auto overflow-x-auto">
            {[
              { id: 'available', label: 'В наличии', count: stats.totalCount },
              { id: 'used', label: 'Использованы', count: stats.usedCount },
              { id: 'disposed', label: 'Утилизированы', count: stats.disposedCount },
              { id: 'all', label: 'Все записи', count: residuals.length }
            ].map(st => (
              <button
                key={st.id}
                onClick={() => setSelectedStatus(st.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  selectedStatus === st.id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>{st.label}</span>
                <span className="px-1.5 py-0.2 rounded-md bg-slate-200 text-[10px] font-mono">
                  {st.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Category filter pills */}
        <div className="flex items-center gap-2 overflow-x-auto pt-1 pb-1">
          <span className="text-xs font-bold text-slate-500 shrink-0 mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Категория:
          </span>
          {categoriesList.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                selectedCategory === cat.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Table View */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Box className="w-6 h-6" />
            </div>
            <div className="text-sm font-bold text-slate-800">
              Остатков не найдено
            </div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              По выбранным фильтрам и поиску позиций не обнаружено. Попробуйте сбросить фильтры или добавьте новый остаток материала.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Тип / Группа</th>
                  <th className="py-3 px-4">Наименование / Декор / Бренд</th>
                  <th className="py-3 px-4">Размеры / Метраж</th>
                  <th className="py-3 px-4">Количество / Объем</th>
                  <th className="py-3 px-4">Стеллаж / Заказ</th>
                  <th className="py-3 px-4">Внес сотрудник (ФИО)</th>
                  <th className="py-3 px-4">Статус</th>
                  <th className="py-3 px-4 text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filtered.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Category */}
                    <td className="py-3.5 px-4 font-bold">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border ${
                        getCategoryBadgeClass(item.category, item.type)
                      }`}>
                        {item.category || item.type}
                      </span>
                    </td>

                    {/* Material Name & Details */}
                    <td className="py-3.5 px-4 font-bold text-slate-900 max-w-xs">
                      <div className="font-extrabold text-slate-900">{item.materialName}</div>
                      
                      <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px] text-slate-600 font-normal">
                        {item.brand && (
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 font-medium">
                            Бренд: <strong>{item.brand}</strong>
                          </span>
                        )}
                        {item.color && (
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 font-medium">
                            Цвет: <strong>{item.color}</strong>
                          </span>
                        )}
                        {item.plinthType && (
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 font-medium">
                            Тип: <strong>{item.plinthType}</strong>
                          </span>
                        )}
                        {item.lightProfileType && (
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 font-medium">
                            Тип: <strong>{item.lightProfileType}</strong>
                          </span>
                        )}
                        {item.golaType && (
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 font-medium">
                            Тип: <strong>GOLA {item.golaType}</strong>
                          </span>
                        )}
                      </div>

                      {item.notes && (
                        <div className="text-[11px] text-slate-500 font-normal italic mt-1">
                          «{item.notes}»
                        </div>
                      )}
                    </td>

                    {/* Dimensions or Length */}
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                      {item.lengthMm && item.widthMm ? (
                        <span>{item.lengthMm} × {item.widthMm} мм {item.thicknessMm ? `(${item.thicknessMm}мм)` : ''}</span>
                      ) : item.lengthMm && item.heightMm ? (
                        <span>L = {item.lengthMm} мм (H = {item.heightMm} мм)</span>
                      ) : item.lengthMm ? (
                        <span>L = {item.lengthMm} мм ({(item.lengthMm / 1000).toFixed(2)} м)</span>
                      ) : item.lengthMeters ? (
                        <span>{item.lengthMeters} пог. м</span>
                      ) : (
                        <span>—</span>
                      )}
                    </td>

                    {/* Area / Qty */}
                    <td className="py-3.5 px-4 font-bold">
                      {item.areaM2 ? (
                        <span className="text-blue-700">{item.areaM2} м² ({item.quantity} шт)</span>
                      ) : item.lengthMeters ? (
                        <span className="text-indigo-700">{item.lengthMeters} м ({item.quantity} рул/хлыст)</span>
                      ) : (
                        <span className="text-slate-700">{item.quantity} шт</span>
                      )}
                    </td>

                    {/* Cell / Order */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1 font-bold text-slate-800">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{item.storageCell || 'Склад'}</span>
                      </div>
                      {item.orderNumber && (
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          Из заказа #{item.orderNumber}
                        </div>
                      )}
                    </td>

                    {/* Added By Employee Name (Strict FIO) */}
                    <td className="py-3.5 px-4 text-slate-600">
                      <div className="flex items-center gap-1.5 font-bold text-slate-900">
                        <User className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>{item.addedByEmployeeName || 'Сотрудник цеха'}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-300" />
                        <span>{item.addedAt ? new Date(item.addedAt).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}</span>
                      </div>
                    </td>

                    {/* Status badge */}
                    <td className="py-3.5 px-4">
                      {item.status === 'available' && (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-black text-[10px] inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> В наличии
                        </span>
                      )}
                      {item.status === 'used' && (
                        <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-black text-[10px] inline-flex items-center gap-1">
                          <Check className="w-3 h-3" /> Использован
                        </span>
                      )}
                      {item.status === 'disposed' && (
                        <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 font-black text-[10px] inline-flex items-center gap-1">
                          <XCircle className="w-3 h-3" /> Утилизирован
                        </span>
                      )}
                    </td>

                    {/* Action buttons */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {item.status === 'available' && (
                          <>
                            <button
                              onClick={() => handleMarkUsed(item)}
                              title="Отметить как использованный"
                              className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[11px] transition-colors cursor-pointer"
                            >
                              Использовать
                            </button>
                            <button
                              onClick={() => setDisposingItem(item)}
                              title="Утилизировать (списать в брак)"
                              className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px] transition-colors cursor-pointer"
                            >
                              Утилизировать
                            </button>
                          </>
                        )}

                        {item.status !== 'available' && (
                          <button
                            onClick={() => handleRestoreAvailable(item)}
                            title="Вернуть в наличие"
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <RotateCcw className="w-3 h-3" /> Вернуть
                          </button>
                        )}

                        <button
                          onClick={() => onDeleteResidual(item.id)}
                          title="Удалить запись"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: MANUAL ADD RESIDUAL (ALL 7 TYPES) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-2xl p-6 space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-600" />
                <span>Внесение остатка материала на склад</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleManualSubmit} className="space-y-4">
              {/* Type Switcher Grid */}
              <div>
                <label className="block text-[11px] font-black text-slate-600 uppercase tracking-wider mb-2">
                  1. Выберите тип материала:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5">
                  {[
                    { type: 'offcut' as const, label: 'Обрезок плиты', icon: Scissors, cat: 'ЛДСП' },
                    { type: 'countertop' as const, label: 'Столешница', icon: Maximize2, cat: 'Столешница' },
                    { type: 'wall_panel' as const, label: 'Стеновая панель', icon: PanelLeft, cat: 'Стеновая панель' },
                    { type: 'plinth' as const, label: 'Цоколь', icon: Columns, cat: 'Цоколь' },
                    { type: 'light_profile' as const, label: 'Подсветка', icon: Lightbulb, cat: 'Профиль подсветки' },
                    { type: 'gola_profile' as const, label: 'GOLA', icon: LayoutGrid, cat: 'Профиль GOLA' },
                    { type: 'edge' as const, label: 'Кромка', icon: Layers, cat: 'Кромка' }
                  ].map(t => {
                    const Icon = t.icon;
                    const isSelected = formType === t.type;
                    return (
                      <button
                        key={t.type}
                        type="button"
                        onClick={() => {
                          setFormType(t.type);
                          setFormCategory(t.cat);
                          setFormError(null);
                        }}
                        className={`p-2.5 rounded-xl font-bold text-xs flex flex-col items-center justify-center gap-1 transition-all cursor-pointer border ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm scale-102'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-[11px] leading-tight text-center">{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic Form fields according to selected type */}
              <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-3">
                <div className="text-[11px] font-black text-blue-900 uppercase tracking-wider">
                  2. Параметры материала:
                </div>

                {/* 1. COUNTERTOP & WALL PANEL */}
                {(formType === 'countertop' || formType === 'wall_panel') && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Бренд {formType === 'countertop' ? 'столешницы' : 'стеновой панели'} *</label>
                        <select
                          value={formBrand}
                          onChange={(e) => setFormBrand(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {COUNTERTOP_BRANDS.map(b => (
                            <option key={b} value={b}>{b}</option>
                          ))}
                        </select>
                      </div>

                      {formBrand === 'Другой бренд' ? (
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Свой бренд *</label>
                          <input
                            type="text"
                            placeholder="Например: Formica, Fundermax..."
                            value={formCustomBrand}
                            onChange={(e) => setFormCustomBrand(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-white border border-blue-300 text-xs font-bold text-slate-900 outline-none"
                          />
                        </div>
                      ) : (
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Толщина (мм)</label>
                          <input
                            type="number"
                            placeholder={formType === 'countertop' ? '38' : '6'}
                            value={formThicknessMm}
                            onChange={(e) => setFormThicknessMm(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-900 outline-none"
                          />
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Декор / Текстура (вносится вручную) *</label>
                      <input
                        type="text"
                        required
                        placeholder="например: Дуб Вотан 2038, Мрамор Черный, Белый кристалл..."
                        value={formDecor}
                        onChange={(e) => setFormDecor(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Длина (мм) *</label>
                        <input
                          type="number"
                          required
                          placeholder="1500"
                          value={formLengthMm}
                          onChange={(e) => setFormLengthMm(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Ширина (мм) *</label>
                        <input
                          type="number"
                          required
                          placeholder={formType === 'countertop' ? '600' : '600'}
                          value={formWidthMm}
                          onChange={(e) => setFormWidthMm(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. PLINTH (ЦОКОЛЬ) */}
                {formType === 'plinth' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Тип цоколя *</label>
                        <select
                          value={formPlinthType}
                          onChange={(e) => setFormPlinthType(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {PLINTH_TYPES.map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Высота цоколя (мм) *</label>
                        <select
                          value={formPlinthHeightMm}
                          onChange={(e) => setFormPlinthHeightMm(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="100">100 мм</option>
                          <option value="150">150 мм</option>
                          <option value="120">120 мм</option>
                          <option value="60">60 мм</option>
                          <option value="80">80 мм</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Цвет цоколя *</label>
                        <select
                          value={formColor}
                          onChange={(e) => setFormColor(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {POPULAR_COLORS.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                          <option value="custom">+ Свой цвет...</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Длина остатка (мм) *</label>
                        <input
                          type="number"
                          required
                          placeholder="2000"
                          value={formLengthMm}
                          onChange={(e) => setFormLengthMm(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    {formColor === 'custom' && (
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Название цвета</label>
                        <input
                          type="text"
                          placeholder="Например: Бежевый глянец"
                          value={formCustomColor}
                          onChange={(e) => setFormCustomColor(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-blue-300 text-xs font-bold text-slate-900 outline-none"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* 3. LIGHT PROFILE (ПРОФИЛЬ ПОДСВЕТКИ) */}
                {formType === 'light_profile' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Тип профиля *</label>
                        <select
                          value={formLightProfileType}
                          onChange={(e) => setFormLightProfileType(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {LIGHT_PROFILE_TYPES.map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Цвет профиля *</label>
                        <select
                          value={formColor}
                          onChange={(e) => setFormColor(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {POPULAR_COLORS.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                          <option value="custom">+ Свой цвет...</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Длина остатка (мм) *</label>
                        <input
                          type="number"
                          required
                          placeholder="1800"
                          value={formLengthMm}
                          onChange={(e) => setFormLengthMm(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Количество (хлыстов)</label>
                        <input
                          type="number"
                          value={formQuantity}
                          onChange={(e) => setFormQuantity(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-900 outline-none"
                        />
                      </div>
                    </div>

                    {formColor === 'custom' && (
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Название цвета</label>
                        <input
                          type="text"
                          placeholder="Например: Брашированное золото"
                          value={formCustomColor}
                          onChange={(e) => setFormCustomColor(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-blue-300 text-xs font-bold text-slate-900 outline-none"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* 4. GOLA PROFILE (ПРОФИЛЬ GOLA) */}
                {formType === 'gola_profile' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Тип GOLA *</label>
                        <select
                          value={formGolaType}
                          onChange={(e) => setFormGolaType(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {GOLA_TYPES.map(g => (
                            <option key={g} value={g.split(' ')[0]}>{g}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Цвет профиля *</label>
                        <select
                          value={formColor}
                          onChange={(e) => setFormColor(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {POPULAR_COLORS.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                          <option value="custom">+ Свой цвет...</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Длина остатка (мм) *</label>
                        <input
                          type="number"
                          required
                          placeholder="2400"
                          value={formLengthMm}
                          onChange={(e) => setFormLengthMm(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Количество (хлыстов)</label>
                        <input
                          type="number"
                          value={formQuantity}
                          onChange={(e) => setFormQuantity(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-900 outline-none"
                        />
                      </div>
                    </div>

                    {formColor === 'custom' && (
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Название цвета</label>
                        <input
                          type="text"
                          placeholder="Например: Матовый титан"
                          value={formCustomColor}
                          onChange={(e) => setFormCustomColor(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-blue-300 text-xs font-bold text-slate-900 outline-none"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* 5. EDGE (КРОМКА) */}
                {formType === 'edge' && (
                  <div className="space-y-3">
                    <EdgeDecorSelector
                      selectedBrand={formBrand}
                      onBrandChange={setFormBrand}
                      decorValue={formMaterialName}
                      onDecorChange={setFormMaterialName}
                      catalogMaterials={catalogMaterials}
                      catalogProducts={catalogProducts}
                    />

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Остаток (в метрах) *</label>
                        <input
                          type="number"
                          required
                          placeholder="35"
                          value={formLengthMeters}
                          onChange={(e) => setFormLengthMeters(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Количество (рулонов)</label>
                        <input
                          type="number"
                          value={formQuantity}
                          onChange={(e) => setFormQuantity(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-900 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 6. OFFCUT (ОБРЕЗОК ПЛИТЫ: ЛДСП/МДФ/ХДФ/ПЛАСТИК) */}
                {formType === 'offcut' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Категория плиты</label>
                        <select
                          value={formCategory}
                          onChange={(e) => setFormCategory(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-900 outline-none"
                        >
                          <option value="ЛДСП">ЛДСП</option>
                          <option value="МДФ">МДФ</option>
                          <option value="ХДФ">ХДФ / ДВП</option>
                          <option value="Пластик">Пластик</option>
                          <option value="Постформинг">Постформинг</option>
                          <option value="Другое">Другое</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Толщина (мм)</label>
                        <input
                          type="number"
                          placeholder="16"
                          value={formThicknessMm}
                          onChange={(e) => setFormThicknessMm(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-900 outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Наименование / декор материала *</label>
                      <input
                        type="text"
                        required
                        placeholder="например: ЛДСП 16мм Дуб Вотан (Egger)"
                        value={formMaterialName}
                        onChange={(e) => setFormMaterialName(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Длина (мм) *</label>
                        <input
                          type="number"
                          required
                          placeholder="1200"
                          value={formLengthMm}
                          onChange={(e) => setFormLengthMm(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Ширина (мм) *</label>
                        <input
                          type="number"
                          required
                          placeholder="600"
                          value={formWidthMm}
                          onChange={(e) => setFormWidthMm(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Storage, Notes, and EMPLOYEE FIO */}
              <div className="space-y-3">
                <div className="text-[11px] font-black text-slate-600 uppercase tracking-wider">
                  3. Хранение и ответственный:
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Ячейка / Место хранения *</label>
                    <input
                      type="text"
                      required
                      placeholder="Стеллаж СТ-1, Стойка 2"
                      value={formStorageCell}
                      onChange={(e) => setFormStorageCell(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Количество (шт)</label>
                    <input
                      type="number"
                      value={formQuantity}
                      onChange={(e) => setFormQuantity(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold outline-none"
                    />
                  </div>
                </div>

                {/* EMPLOYEE NAME SELECTOR */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-blue-600" />
                    <span>Кто внес остаток (ФИО сотрудника) *</span>
                  </label>
                  {employees && employees.length > 0 ? (
                    <div className="space-y-1">
                      <select
                        value={formEmployeeName}
                        onChange={(e) => setFormEmployeeName(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {defaultEmpName && !employees.some(emp => emp.name === defaultEmpName) && (
                          <option value={defaultEmpName}>{defaultEmpName}</option>
                        )}
                        {employees.map((emp) => (
                          <option key={emp.id} value={emp.name}>
                            {emp.name} {emp.role ? `(${emp.role})` : ''}
                          </option>
                        ))}
                        <option value="custom">+ Ввести другое ФИО вручную...</option>
                      </select>
                      {formEmployeeName === 'custom' && (
                        <input
                          type="text"
                          placeholder="Введите ФИО сотрудника..."
                          onChange={(e) => setFormEmployeeName(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-blue-300 text-xs font-bold text-slate-900 outline-none"
                        />
                      )}
                    </div>
                  ) : (
                    <input
                      type="text"
                      required
                      placeholder="ФИО сотрудника"
                      value={formEmployeeName}
                      onChange={(e) => setFormEmployeeName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Примечание</label>
                  <input
                    type="text"
                    placeholder="Качественный обрезок, без сколов, под новый заказ..."
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs cursor-pointer hover:bg-slate-200 transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs shadow-md shadow-blue-200 cursor-pointer transition-all"
                >
                  Сохранить в базу остатков
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DISPOSE CONFIRMATION DIALOG */}
      {disposingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="font-black text-base text-slate-900">
                Подтверждение утилизации
              </h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Вы действительно хотите списать в утилизацию (брак/мусор) материал{' '}
              <strong className="text-slate-900">«{disposingItem.materialName}»</strong>?
              Позиция будет списана с активного складского баланса в архив утилизированных материалов.
            </p>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1 font-mono">
              <div>• Категория: <strong>{disposingItem.category}</strong></div>
              {disposingItem.lengthMm && disposingItem.widthMm ? (
                <div>• Размер: {disposingItem.lengthMm} × {disposingItem.widthMm} мм {disposingItem.areaM2 ? `(${disposingItem.areaM2} м²)` : ''}</div>
              ) : disposingItem.lengthMm ? (
                <div>• Длина: {disposingItem.lengthMm} мм</div>
              ) : disposingItem.lengthMeters ? (
                <div>• Остаток: {disposingItem.lengthMeters} пог. м</div>
              ) : null}
              <div>• Место: {disposingItem.storageCell || 'Склад'}</div>
              <div>• Внес: {disposingItem.addedByEmployeeName || '—'}</div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDisposingItem(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleConfirmDispose}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-200 cursor-pointer"
              >
                Списать в утилизацию
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

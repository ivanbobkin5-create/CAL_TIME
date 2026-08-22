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
  Sparkles
} from 'lucide-react';
import { MaterialResidual, ERPEmployee, ProductionOrder } from '../types';

interface ERPMaterialResidualsViewProps {
  residuals: MaterialResidual[];
  currentUser?: ERPEmployee | null;
  employees?: ERPEmployee[];
  orders?: ProductionOrder[];
  companyName?: string;
  onAddResidual: (item: MaterialResidual) => void;
  onUpdateResidual: (item: MaterialResidual) => void;
  onDeleteResidual: (id: string) => void;
}

export const ERPMaterialResidualsView: React.FC<ERPMaterialResidualsViewProps> = ({
  residuals,
  currentUser,
  employees = [],
  orders = [],
  companyName,
  onAddResidual,
  onUpdateResidual,
  onDeleteResidual
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('available');

  // Modal state for manual creation
  const [showAddModal, setShowAddModal] = useState(false);
  const [formType, setFormType] = useState<'offcut' | 'edge'>('offcut');
  const [formCategory, setFormCategory] = useState<string>('ЛДСП');
  const [formMaterialName, setFormMaterialName] = useState('');
  const [formLengthMm, setFormLengthMm] = useState('');
  const [formWidthMm, setFormWidthMm] = useState('');
  const [formThicknessMm, setFormThicknessMm] = useState('16');
  const [formLengthMeters, setFormLengthMeters] = useState('');
  const [formQuantity, setFormQuantity] = useState('1');
  const [formStorageCell, setFormStorageCell] = useState('Стеллаж остатков');
  const [formNotes, setFormNotes] = useState('');

  // Dispose confirmation modal state
  const [disposingItem, setDisposingItem] = useState<MaterialResidual | null>(null);

  // Categories list
  const categoriesList = [
    { id: 'all', name: 'Все категории' },
    { id: 'ЛДСП', name: 'ЛДСП (Обрезки)' },
    { id: 'МДФ', name: 'МДФ (Обрезки)' },
    { id: 'ХДФ', name: 'ХДФ / ДВП' },
    { id: 'Кромка', name: 'Кромка (Рулоны)' },
    { id: 'Пластик', name: 'Пластик / Постформинг' },
    { id: 'Другое', name: 'Другие материалы' }
  ];

  // Filtered residuals
  const filtered = useMemo(() => {
    return residuals.filter(r => {
      if (selectedStatus !== 'all' && r.status !== selectedStatus) return false;
      if (selectedCategory !== 'all' && r.category !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          r.materialName.toLowerCase().includes(q) ||
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

    const totalOffcutsM2 = offcutsAvailable.reduce((acc, curr) => acc + (curr.areaM2 || 0), 0);
    const totalEdgesMeters = edgesAvailable.reduce((acc, curr) => acc + (curr.lengthMeters || 0), 0);

    return {
      totalCount: available.length,
      offcutsCount: offcutsAvailable.length,
      offcutsAreaM2: Number(totalOffcutsM2.toFixed(2)),
      edgesCount: edgesAvailable.length,
      edgesMeters: Number(totalEdgesMeters.toFixed(1)),
      disposedCount: residuals.filter(r => r.status === 'disposed').length,
      usedCount: residuals.filter(r => r.status === 'used').length
    };
  }, [residuals]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formMaterialName.trim()) return;

    const qty = Number(formQuantity) || 1;
    let newResidual: MaterialResidual;

    if (formType === 'offcut') {
      const len = Number(formLengthMm) || 0;
      const wid = Number(formWidthMm) || 0;
      const thick = Number(formThicknessMm) || 16;
      const areaM2 = Number(((len * wid * qty) / 1000000).toFixed(3));

      newResidual = {
        id: `res-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        type: 'offcut',
        category: formCategory,
        materialName: formMaterialName.trim(),
        thicknessMm: thick,
        lengthMm: len,
        widthMm: wid,
        areaM2: areaM2,
        quantity: qty,
        addedAt: new Date().toISOString(),
        addedByEmployeeName: currentUser?.name || 'Кладовщик / Руководитель',
        storageCell: formStorageCell.trim() || 'Складирование обрезков',
        notes: formNotes.trim(),
        status: 'available'
      };
    } else {
      const lenM = Number(formLengthMeters) || 0;
      newResidual = {
        id: `res-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        type: 'edge',
        category: 'Кромка',
        materialName: formMaterialName.trim(),
        lengthMeters: lenM,
        quantity: qty,
        addedAt: new Date().toISOString(),
        addedByEmployeeName: currentUser?.name || 'Кладовщик / Руководитель',
        storageCell: formStorageCell.trim() || 'Стеллаж кромки',
        notes: formNotes.trim(),
        status: 'available'
      };
    }

    onAddResidual(newResidual);
    setShowAddModal(false);

    // Reset
    setFormMaterialName('');
    setFormLengthMm('');
    setFormWidthMm('');
    setFormLengthMeters('');
    setFormNotes('');
  };

  const handleConfirmDispose = () => {
    if (!disposingItem) return;
    const updated: MaterialResidual = {
      ...disposingItem,
      status: 'disposed',
      disposedAt: new Date().toISOString(),
      disposedByEmployeeName: currentUser?.name || 'Сотрудник цеха'
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
            Учет обрезков плит (ЛДСП/МДФ) после распила и кромки в метрах. Поиск, фильтрация и кнопка утилизации.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-200 transition-all flex items-center gap-2 cursor-pointer self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Внести остаток вручную</span>
        </button>
      </div>

      {/* Stats Summary Widgets */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
            <span>Остатки кромки</span>
            <Layers className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {stats.edgesMeters} <span className="text-sm font-bold text-slate-500">пог. м</span>
          </div>
          <div className="text-[11px] font-medium text-slate-500 mt-1">
            В наличии {stats.edgesCount} наименований
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Использовано в заказах</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700">
            {stats.usedCount} <span className="text-sm font-bold text-slate-500">поз.</span>
          </div>
          <div className="text-[11px] font-medium text-slate-500 mt-1">
            Повторно применены
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Утилизировано</span>
            <XCircle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-600">
            {stats.disposedCount} <span className="text-sm font-bold text-slate-500">поз.</span>
          </div>
          <div className="text-[11px] font-medium text-slate-500 mt-1">
            Списаны в брак / мусор
          </div>
        </div>
      </div>

      {/* Toolbar: Search, Filters, Status tabs */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Поиск по названию, ячейке, заказу..."
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
          <span className="text-xs font-bold text-slate-500 shrink-0 mr-1">Группа:</span>
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
              По выбранным фильтрам и поиску позиций не обнаружено. Попробуйте сбросить фильтры или добавьте новый обрезок.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Тип / Группа</th>
                  <th className="py-3 px-4">Наименование материала</th>
                  <th className="py-3 px-4">Размеры / Метраж</th>
                  <th className="py-3 px-4">Объем / Площадь</th>
                  <th className="py-3 px-4">Стеллаж / Заказ</th>
                  <th className="py-3 px-4">Внесен / Дата</th>
                  <th className="py-3 px-4">Статус</th>
                  <th className="py-3 px-4 text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filtered.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Category */}
                    <td className="py-3.5 px-4 font-bold">
                      <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${
                        item.type === 'edge' 
                          ? 'bg-indigo-100 text-indigo-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {item.category}
                      </span>
                    </td>

                    {/* Material Name */}
                    <td className="py-3.5 px-4 font-bold text-slate-900 max-w-xs">
                      <div>{item.materialName}</div>
                      {item.notes && (
                        <div className="text-[11px] text-slate-500 font-normal italic mt-0.5">
                          «{item.notes}»
                        </div>
                      )}
                    </td>

                    {/* Dimensions or Length */}
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                      {item.type === 'offcut' ? (
                        <span>{item.lengthMm} × {item.widthMm} мм ({item.thicknessMm}мм)</span>
                      ) : (
                        <span>{item.lengthMeters} пог. м</span>
                      )}
                    </td>

                    {/* Area / Qty */}
                    <td className="py-3.5 px-4 font-bold">
                      {item.type === 'offcut' ? (
                        <span className="text-blue-700">{item.areaM2} м² ({item.quantity} шт)</span>
                      ) : (
                        <span className="text-indigo-700">{item.lengthMeters} м ({item.quantity} рул)</span>
                      )}
                    </td>

                    {/* Cell / Order */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1 font-bold text-slate-800">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{item.storageCell || 'Склад'}</span>
                      </div>
                      {item.orderNumber && (
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          Из заказа #{item.orderNumber}
                        </div>
                      )}
                    </td>

                    {/* Added By */}
                    <td className="py-3.5 px-4 text-slate-600">
                      <div className="font-bold text-slate-800">{item.addedByEmployeeName || 'Оператор'}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {item.addedAt ? new Date(item.addedAt).toLocaleDateString('ru-RU') : '—'}
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
                              title="Утилизировать (выбросить в брак)"
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

      {/* MODAL: MANUAL ADD RESIDUAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-black text-base text-slate-900">
                Внесение остатка материала вручную
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-3">
              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => { setFormType('offcut'); setFormCategory('ЛДСП'); }}
                  className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer ${
                    formType === 'offcut'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Scissors className="w-4 h-4" />
                  <span>Обрезок плиты</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setFormType('edge'); setFormCategory('Кромка'); }}
                  className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer ${
                    formType === 'edge'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  <span>Остаток кромки</span>
                </button>
              </div>

              {/* Form fields */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Наименование материала *</label>
                <input
                  type="text"
                  required
                  placeholder={formType === 'offcut' ? "например: ЛДСП 16мм Дуб Вотан" : "например: Кромка ПВХ 2/19 Белый"}
                  value={formMaterialName}
                  onChange={(e) => setFormMaterialName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {formType === 'offcut' ? (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Категория</label>
                      <select
                        value={formCategory}
                        onChange={(e) => setFormCategory(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold outline-none"
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
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold outline-none"
                      />
                    </div>
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
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold outline-none"
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
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold outline-none"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Остаток (в метрах) *</label>
                    <input
                      type="number"
                      required
                      placeholder="35"
                      value={formLengthMeters}
                      onChange={(e) => setFormLengthMeters(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Количество (шт/рул)</label>
                    <input
                      type="number"
                      value={formQuantity}
                      onChange={(e) => setFormQuantity(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold outline-none"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Ячейка / Место хранения</label>
                  <input
                    type="text"
                    placeholder="Стеллаж Б-3"
                    value={formStorageCell}
                    onChange={(e) => setFormStorageCell(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Примечание</label>
                  <input
                    type="text"
                    placeholder="Примечание к остатку"
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
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md cursor-pointer"
                >
                  Сохранить
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
              Вы действительно хотите отправить в утилизацию материал{' '}
              <strong className="text-slate-900">«{disposingItem.materialName}»</strong>?
              Позиция будет списана с баланса в архив утилизированных материалов.
            </p>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1 font-mono">
              <div>• Тип: {disposingItem.category}</div>
              {disposingItem.type === 'offcut' ? (
                <div>• Размер: {disposingItem.lengthMm} × {disposingItem.widthMm} мм ({disposingItem.areaM2} м²)</div>
              ) : (
                <div>• Остаток: {disposingItem.lengthMeters} пог. м</div>
              )}
              <div>• Место: {disposingItem.storageCell}</div>
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
                Утилизировать
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

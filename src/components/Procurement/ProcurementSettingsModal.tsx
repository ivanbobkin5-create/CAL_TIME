import React, { useState } from 'react';
import { 
  X, Settings, Plus, Trash2, Edit2, Check, Save, ToggleLeft, ToggleRight, Tag, HelpCircle
} from 'lucide-react';
import { cn } from '../../lib/utils';

export interface ProcurementCategoryDef {
  id: string;
  name: string;
  keywords: string[];
}

export interface ProcurementSettingsData {
  fetchCostsFromB24: boolean;
  customCategories: ProcurementCategoryDef[];
}

interface ProcurementSettingsModalProps {
  settings: ProcurementSettingsData;
  onClose: () => void;
  onSave: (newSettings: ProcurementSettingsData) => void;
  showAlert?: (title: string, msg: string) => void;
}

export const ProcurementSettingsModal: React.FC<ProcurementSettingsModalProps> = ({
  settings,
  onClose,
  onSave,
  showAlert = (t, m) => alert(`${t}: ${m}`)
}) => {
  const [fetchCostsFromB24, setFetchCostsFromB24] = useState<boolean>(settings.fetchCostsFromB24 ?? true);
  const [categories, setCategories] = useState<ProcurementCategoryDef[]>(settings.customCategories || []);
  const [newCatName, setNewCatName] = useState('');
  const [newCatKeywords, setNewCatKeywords] = useState('');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState('');
  const [editCatKeywords, setEditCatKeywords] = useState('');

  const handleAddCategory = () => {
    const nameClean = newCatName.trim();
    if (!nameClean) {
      showAlert('Укажите название', 'Название категории не может быть пустым');
      return;
    }
    const kws = newCatKeywords.split(',').map(k => k.trim()).filter(Boolean);
    const newCat: ProcurementCategoryDef = {
      id: `cat_${Date.now()}`,
      name: nameClean,
      keywords: kws.length > 0 ? kws : [nameClean.toLowerCase()]
    };
    setCategories(prev => [...prev, newCat]);
    setNewCatName('');
    setNewCatKeywords('');
  };

  const handleDeleteCategory = (id: string) => {
    if (categories.length <= 1) {
      showAlert('Ошибка', 'Должна оставаться хотя бы одна категория снабжения');
      return;
    }
    setCategories(prev => prev.filter(c => c.id !== id));
  };

  const handleStartEdit = (cat: ProcurementCategoryDef) => {
    setEditingCatId(cat.id);
    setEditCatName(cat.name);
    setEditCatKeywords(cat.keywords.join(', '));
  };

  const handleSaveEdit = () => {
    if (!editingCatId) return;
    const nameClean = editCatName.trim();
    if (!nameClean) return;
    const kws = editCatKeywords.split(',').map(k => k.trim()).filter(Boolean);

    setCategories(prev => prev.map(c => {
      if (c.id === editingCatId) {
        return {
          ...c,
          name: nameClean,
          keywords: kws
        };
      }
      return c;
    }));
    setEditingCatId(null);
  };

  const handleSaveAll = () => {
    onSave({
      fetchCostsFromB24,
      customCategories: categories
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-400/30 flex items-center justify-center shrink-0">
              <Settings className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <h3 className="font-extrabold text-base">Настройки раздела «Снабжение»</h3>
              <p className="text-xs text-slate-300">Расходы Битрикс24, категории закупки и сопоставление файлов Базис</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* 1. Bitrix24 Costs Fetch Toggle */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <span>Подтягивать плановые суммы расходов из сделки в Битрикс24</span>
              </h4>
              <p className="text-xs text-slate-500">
                При включенном параметре плановые расходы по категориям закупки автоматически подгружаются из пользовательских полей сделки Битрикс24.
              </p>
            </div>

            <button
              onClick={() => setFetchCostsFromB24(!fetchCostsFromB24)}
              className={cn(
                "px-4 py-2 rounded-2xl font-black text-xs transition-all flex items-center gap-2 shrink-0 cursor-pointer shadow-xs",
                fetchCostsFromB24 
                  ? "bg-emerald-600 text-white shadow-emerald-100" 
                  : "bg-slate-200 text-slate-700"
              )}
            >
              {fetchCostsFromB24 ? <ToggleRight className="w-5 h-5 text-emerald-200" /> : <ToggleLeft className="w-5 h-5 text-slate-400" />}
              <span>{fetchCostsFromB24 ? 'Включено' : 'Выключено'}</span>
            </button>
          </div>

          {/* 2. Custom Categories Management */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-extrabold text-slate-900 text-sm">Категории закупки и правила Базис</h4>
                <p className="text-xs text-slate-500">
                  Укажите ключевые слова из импортируемого файла Базис, чтобы товары автоматически попадали в нужную категорию.
                </p>
              </div>
            </div>

            {/* Existing Categories List */}
            <div className="border border-slate-200 rounded-2xl divide-y divide-slate-100 overflow-hidden bg-white">
              {categories.map((cat) => (
                <div key={cat.id} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50/80 transition-all">
                  
                  {editingCatId === cat.id ? (
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={editCatName}
                        onChange={(e) => setEditCatName(e.target.value)}
                        placeholder="Название категории"
                        className="px-3 py-1.5 bg-slate-100 border border-slate-300 rounded-xl text-xs font-bold focus:outline-hidden focus:border-indigo-600"
                      />
                      <input
                        type="text"
                        value={editCatKeywords}
                        onChange={(e) => setEditCatKeywords(e.target.value)}
                        placeholder="Ключевые слова через запятую"
                        className="px-3 py-1.5 bg-slate-100 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-indigo-600"
                      />
                    </div>
                  ) : (
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="font-extrabold text-slate-900 text-xs flex items-center gap-2">
                        <Tag className="w-3.5 h-3.5 text-indigo-600" />
                        <span>{cat.name}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        Ключевые слова Базис: <strong className="text-indigo-900 font-mono">{cat.keywords?.join(', ') || 'не заданы'}</strong>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-1 shrink-0">
                    {editingCatId === cat.id ? (
                      <button
                        onClick={handleSaveEdit}
                        className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all cursor-pointer shadow-xs"
                        title="Сохранить изменения"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => handleStartEdit(cat)}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all cursor-pointer"
                          title="Редактировать категорию"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(cat.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                          title="Удалить категорию"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>

                </div>
              ))}
            </div>

            {/* Add New Category Form */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <h5 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                + Добавить новую категорию снабжения
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="Название (напр., Стекло и Зеркала)"
                  className="px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold focus:outline-hidden focus:border-indigo-600"
                />
                <input
                  type="text"
                  value={newCatKeywords}
                  onChange={(e) => setNewCatKeywords(e.target.value)}
                  placeholder="Ключевые слова из файла Базис через запятую"
                  className="px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-indigo-600"
                />
              </div>
              <button
                onClick={handleAddCategory}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Добавить категорию</span>
              </button>
            </div>

          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs transition-all cursor-pointer"
          >
            Отмена
          </button>
          <button
            onClick={handleSaveAll}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Сохранить настройки</span>
          </button>
        </div>

      </div>
    </div>
  );
};

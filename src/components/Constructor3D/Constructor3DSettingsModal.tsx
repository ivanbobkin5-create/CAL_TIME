import React, { useState } from 'react';
import { X, Sliders, Check, RotateCcw, Wrench, Package, Shield, Layers } from 'lucide-react';
import {
  ConstructorCompanySettings,
  DEFAULT_CONSTRUCTOR_COMPANY_SETTINGS,
} from './constructorPresets';

interface Constructor3DSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ConstructorCompanySettings;
  onSaveSettings: (newSettings: ConstructorCompanySettings) => void;
}

export const Constructor3DSettingsModal: React.FC<Constructor3DSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
}) => {
  const [formData, setFormData] = useState<ConstructorCompanySettings>({
    ...DEFAULT_CONSTRUCTOR_COMPANY_SETTINGS,
    ...settings,
  });
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleChange = (field: keyof ConstructorCompanySettings, val: any) => {
    setFormData((prev) => ({ ...prev, [field]: val }));
    setSavedSuccess(false);
  };

  const handleSave = () => {
    onSaveSettings(formData);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

  const handleResetDefaults = () => {
    setFormData(DEFAULT_CONSTRUCTOR_COMPANY_SETTINGS);
    setSavedSuccess(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-300">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Настройки 3D Конструктора компании</h2>
              <p className="text-xs text-slate-400">
                Настройка соответствия стандартных механизмов, петель и фурнитуры вашему каталогу
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-800">
          {/* Section 1: Hinges Mapping */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
              <Wrench className="w-4 h-4 text-purple-600" />
              <span>1. Петли дверных фасадов</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-600 font-medium mb-1">
                  Петли накладные (стандарт)
                </label>
                <input
                  type="text"
                  value={formData.overlayHingeProductName}
                  onChange={(e) => handleChange('overlayHingeProductName', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-purple-500 focus:outline-none bg-white"
                  placeholder="Название петель из вашего каталога..."
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
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-purple-500 focus:outline-none bg-white"
                  placeholder="Название полунакладных петель..."
                />
              </div>
              <div>
                <label className="block text-slate-600 font-medium mb-1">Петли вкладные</label>
                <input
                  type="text"
                  value={formData.insetHingeProductName}
                  onChange={(e) => handleChange('insetHingeProductName', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-purple-500 focus:outline-none bg-white"
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
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-purple-500 focus:outline-none bg-white"
                  placeholder="Название угловых петель..."
                />
              </div>
            </div>
          </div>

          {/* Section 2: Drawer Systems Mapping */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
              <Package className="w-4 h-4 text-purple-600" />
              <span>2. Системы выдвижения ящиков</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-600 font-medium mb-1">
                  Скрытого монтажа (BOYARD/Blum/etc.)
                </label>
                <input
                  type="text"
                  value={formData.concealedDrawerProductName}
                  onChange={(e) => handleChange('concealedDrawerProductName', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-purple-500 focus:outline-none bg-white"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-medium mb-1">
                  Тандембоксы (металл. боковины)
                </label>
                <input
                  type="text"
                  value={formData.tandemboxDrawerProductName}
                  onChange={(e) => handleChange('tandemboxDrawerProductName', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-purple-500 focus:outline-none bg-white"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-medium mb-1">
                  Телескопические (шариковые)
                </label>
                <input
                  type="text"
                  value={formData.telescopicDrawerProductName}
                  onChange={(e) => handleChange('telescopicDrawerProductName', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-purple-500 focus:outline-none bg-white"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-medium mb-1">Металлобоксы</label>
                <input
                  type="text"
                  value={formData.metaboxDrawerProductName}
                  onChange={(e) => handleChange('metaboxDrawerProductName', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-purple-500 focus:outline-none bg-white"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Lift Mechanisms Mapping */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
              <Layers className="w-4 h-4 text-purple-600" />
              <span>3. Подъемные механизмы верхних фасадов</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-slate-600 font-medium mb-1">
                  Газлифты пневматические
                </label>
                <input
                  type="text"
                  value={formData.gasLiftProductName}
                  onChange={(e) => handleChange('gasLiftProductName', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-purple-500 focus:outline-none bg-white"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-medium mb-1">
                  Blum AVENTOS HF Top (складной)
                </label>
                <input
                  type="text"
                  value={formData.aventosHfProductName}
                  onChange={(e) => handleChange('aventosHfProductName', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-purple-500 focus:outline-none bg-white"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-medium mb-1">
                  Blum AVENTOS HK (поворотный)
                </label>
                <input
                  type="text"
                  value={formData.aventosHkProductName}
                  onChange={(e) => handleChange('aventosHkProductName', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-purple-500 focus:outline-none bg-white"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Protective Accessories & Worktop Defaults */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
              <Shield className="w-4 h-4 text-purple-600" />
              <span>4. Защита, аксессуары и соединение столешницы</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-600 font-medium mb-1">
                  Поддон гигиенический в модуль мойки
                </label>
                <input
                  type="text"
                  value={formData.defaultSinkDripTrayName}
                  onChange={(e) => handleChange('defaultSinkDripTrayName', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-purple-500 focus:outline-none bg-white"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-medium mb-1">
                  Термопланки защитные для духового шкафа
                </label>
                <input
                  type="text"
                  value={formData.defaultOvenThermalStripsName}
                  onChange={(e) => handleChange('defaultOvenThermalStripsName', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-purple-500 focus:outline-none bg-white"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-medium mb-1">
                  Тип углового соединения столешниц
                </label>
                <select
                  value={formData.defaultWorktopJointType}
                  onChange={(e) =>
                    handleChange('defaultWorktopJointType', e.target.value as 'plank' | 'eurojoint')
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-purple-500 focus:outline-none bg-white font-semibold"
                >
                  <option value="plank">Через соединительную планку</option>
                  <option value="eurojoint">Еврозапил (+70 мм запас к длине)</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-600 font-medium mb-1">
                  Стандартная длина плит столешниц
                </label>
                <select
                  value={formData.defaultWorktopStockLength}
                  onChange={(e) =>
                    handleChange('defaultWorktopStockLength', Number(e.target.value) as 3000 | 4000)
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-purple-500 focus:outline-none bg-white font-semibold"
                >
                  <option value={3000}>3000 мм (стандарт)</option>
                  <option value={4000}>4000 мм (увеличенная)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-100 border-t border-slate-200">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Сбросить к базовым стандартам</span>
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition-colors"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-md transition-all"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>Сохранено!</span>
                </>
              ) : (
                <span>Сохранить настройки 3D</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

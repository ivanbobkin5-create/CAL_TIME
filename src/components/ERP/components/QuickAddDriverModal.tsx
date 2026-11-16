import React, { useState } from 'react';
import { X, Truck, User, Phone, Check, Shield } from 'lucide-react';
import { ERPEmployee } from '../types';

interface QuickAddDriverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddDriver: (driver: Partial<ERPEmployee>) => void;
}

export const QuickAddDriverModal: React.FC<QuickAddDriverModalProps> = ({
  isOpen,
  onClose,
  onAddDriver
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [carPlate, setCarPlate] = useState('');
  const [carModel, setCarModel] = useState('');
  const [employmentType, setEmploymentType] = useState<'staff' | 'outsource'>('outsource');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newDriver: Partial<ERPEmployee> = {
      name: name.trim(),
      role: 'Водитель / Экспедитор',
      productionRole: 'Водитель',
      isProductionEmployee: true,
      department: 'warehouse',
      phone: phone.trim(),
      carPlate: carPlate.trim().toUpperCase(),
      carModel: carModel.trim(),
      employmentType: employmentType,
      rateType: 'piecework',
      baseRate: 0,
      shiftType: 'flexible',
      status: 'active'
    };

    onAddDriver(newDriver);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center shrink-0">
              <Truck className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                Добавить нового водителя
              </h3>
              <p className="text-[11px] text-slate-500">
                Сотрудник сохранится в списке сотрудников ERP
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Employment Type */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Тип сотрудника</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setEmploymentType('outsource')}
                className={`p-2.5 rounded-2xl border font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  employmentType === 'outsource'
                    ? 'bg-amber-500 text-white border-amber-600 shadow-md shadow-amber-500/20'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>🤝 Аутсорс / Наемный</span>
              </button>

              <button
                type="button"
                onClick={() => setEmploymentType('staff')}
                className={`p-2.5 rounded-2xl border font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  employmentType === 'staff'
                    ? 'bg-blue-600 text-white border-blue-700 shadow-md shadow-blue-600/20'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>🏢 Штатный работник</span>
              </button>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">ФИО Водителя *</label>
            <input
              type="text"
              required
              placeholder="например: Сидоров Сергей Михайлович"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 font-bold text-xs text-slate-900 outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Телефон водителя</label>
            <input
              type="text"
              placeholder="+7 (999) 000-00-00"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 font-bold text-xs text-slate-900 outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          {/* Car Plate & Model */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Госномер ТС</label>
              <input
                type="text"
                placeholder="А 123 ВС 777"
                value={carPlate}
                onChange={(e) => setCarPlate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 font-mono font-bold text-xs text-slate-900 uppercase outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Марка / Авто</label>
              <input
                type="text"
                placeholder="ГАЗель Некст"
                value={carModel}
                onChange={(e) => setCarModel(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 font-bold text-xs text-slate-900 outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-5 py-2.5 rounded-2xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white font-bold text-xs cursor-pointer shadow-md shadow-violet-200 transition-all flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Сохранить водителя</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

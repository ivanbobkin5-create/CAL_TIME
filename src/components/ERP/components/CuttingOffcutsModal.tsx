import React, { useState } from 'react';
import { Scissors, Plus, Trash2, CheckCircle2, AlertTriangle, X, Ruler, User } from 'lucide-react';
import { ProductionOrder, ERPEmployee, MaterialResidual } from '../types';

interface CuttingOffcutsModalProps {
  isOpen: boolean;
  order: ProductionOrder;
  currentUser?: ERPEmployee | any | null;
  employees?: ERPEmployee[];
  onClose: () => void;
  onSubmit: (offcuts: MaterialResidual[]) => void;
}

export const CuttingOffcutsModal: React.FC<CuttingOffcutsModalProps> = ({
  isOpen,
  order,
  currentUser,
  employees = [],
  onClose,
  onSubmit
}) => {
  const [offcutsList, setOffcutsList] = useState<MaterialResidual[]>([]);

  // Default employee name from currentUser or order
  const resolvedDefaultEmpName = 
    currentUser?.employeeName || 
    currentUser?.name || 
    currentUser?.displayName || 
    order.responsibleEmployeeName || 
    (employees.length > 0 ? employees[0].name : '');

  const [employeeName, setEmployeeName] = useState<string>(resolvedDefaultEmpName);

  // Default material from order material groups if available
  const defaultMatName = order.birkaData?.materialGroups?.[0]?.materialName || 'ЛДСП 16мм';

  const [selectedMaterial, setSelectedMaterial] = useState<string>(defaultMatName);
  const [customMaterial, setCustomMaterial] = useState<string>('');
  const [lengthMm, setLengthMm] = useState<string>('');
  const [widthMm, setWidthMm] = useState<string>('');
  const [thicknessMm, setThicknessMm] = useState<string>('16');
  const [quantity, setQuantity] = useState<string>('1');
  const [storageCell, setStorageCell] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddOffcutToList = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const mat = selectedMaterial === 'CUSTOM' ? customMaterial.trim() : selectedMaterial;
    if (!mat) {
      setFormError('Укажите наименование материала');
      return;
    }

    const currentEmp = employeeName.trim() || resolvedDefaultEmpName || 'Сотрудник цеха';
    if (!currentEmp) {
      setFormError('Укажите ФИО сотрудника, вносящего остаток');
      return;
    }

    const len = Number(lengthMm);
    const wid = Number(widthMm);
    const thick = Number(thicknessMm) || 16;
    const qty = Number(quantity) || 1;

    if (!len || len <= 0 || !wid || wid <= 0) {
      setFormError('Укажите корректную длину и ширину обрезка (в мм)');
      return;
    }

    // Determine category based on material name
    let category = 'ЛДСП';
    const lowerMat = mat.toLowerCase();
    if (lowerMat.includes('мдф') || lowerMat.includes('mdf')) category = 'МДФ';
    else if (lowerMat.includes('хдф') || lowerMat.includes('двп')) category = 'ХДФ';
    else if (lowerMat.includes('пластик')) category = 'Пластик';
    else if (lowerMat.includes('постформинг')) category = 'Постформинг';

    const areaM2 = Number(((len * wid * qty) / 1000000).toFixed(3));

    const newOffcut: MaterialResidual = {
      id: `offcut-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      orderId: order.id,
      orderNumber: order.orderNumber,
      type: 'offcut',
      category: category,
      materialName: mat,
      thicknessMm: thick,
      lengthMm: len,
      widthMm: wid,
      areaM2: areaM2,
      quantity: qty,
      addedAt: new Date().toISOString(),
      addedByEmployeeName: currentEmp,
      storageCell: storageCell.trim() || 'Стеллаж обрезков',
      notes: notes.trim(),
      status: 'available'
    };

    setOffcutsList(prev => [...prev, newOffcut]);

    // Reset inputs
    setLengthMm('');
    setWidthMm('');
    setNotes('');
  };

  const handleRemoveItem = (id: string) => {
    setOffcutsList(prev => prev.filter(item => item.id !== id));
  };

  const handleFinish = (saveOffcuts: boolean) => {
    if (saveOffcuts && offcutsList.length > 0) {
      onSubmit(offcutsList);
    } else {
      onSubmit([]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-blue-900 to-indigo-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
              <Scissors className="w-5 h-5 text-blue-300" />
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-blue-300 font-bold">
                Завершение этапа распила • Заказ #{order.orderNumber}
              </div>
              <h3 className="text-base font-black text-white">
                Заполнение остатков материалов (Обрезки)
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Operator Banner Instruction */}
          <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300/80 text-amber-950 space-y-2">
            <div className="flex items-center gap-2 font-black text-xs uppercase tracking-wider text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              ИНСТРУКЦИЯ ДЛЯ ОПЕРАТОРА РАСПИЛА:
            </div>
            <p className="text-xs text-amber-900 leading-relaxed font-medium">
              Пожалуйста, замерьте качественные деловые остатки плиты рулеткой и введите их параметры ниже.
              Каждый обрезок заносится в единую базу остатков склада для дальнейшего использования в новых заказах.
            </p>
          </div>

          {/* Form to add an offcut */}
          <form onSubmit={handleAddOffcutToList} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <div className="text-xs font-black text-slate-800 uppercase tracking-wider">
              + Добавление обрезка плиты
            </div>

            {formError && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Материал обрезка *</label>
                <select
                  value={selectedMaterial}
                  onChange={(e) => setSelectedMaterial(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {order.birkaData?.materialGroups?.map((mg) => (
                    <option key={mg.materialName} value={mg.materialName}>
                      {mg.materialName}
                    </option>
                  ))}
                  <option value="CUSTOM">+ Ввести кастомный материал...</option>
                </select>

                {selectedMaterial === 'CUSTOM' && (
                  <input
                    type="text"
                    placeholder="Например: ЛДСП 16мм Белый влагостойкий"
                    value={customMaterial}
                    onChange={(e) => setCustomMaterial(e.target.value)}
                    className="mt-2 w-full px-3 py-2 rounded-xl bg-white border border-blue-300 text-xs font-bold text-slate-900 outline-none"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Длина (мм) *</label>
                  <input
                    type="number"
                    placeholder="1200"
                    value={lengthMm}
                    onChange={(e) => setLengthMm(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Ширина (мм) *</label>
                  <input
                    type="number"
                    placeholder="600"
                    value={widthMm}
                    onChange={(e) => setWidthMm(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Толщина (мм)</label>
                <input
                  type="number"
                  placeholder="16"
                  value={thicknessMm}
                  onChange={(e) => setThicknessMm(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-900 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Количество (шт)</label>
                <input
                  type="number"
                  placeholder="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-900 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Ячейка хранения</label>
                <input
                  type="text"
                  placeholder="Стеллаж А-2"
                  value={storageCell}
                  onChange={(e) => setStorageCell(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-900 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-blue-600" />
                  <span>Кто внес остаток (ФИО сотрудника) *</span>
                </label>
                {employees && employees.length > 0 ? (
                  <div className="space-y-1">
                    <select
                      value={employeeName}
                      onChange={(e) => setEmployeeName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {resolvedDefaultEmpName && !employees.some(emp => emp.name === resolvedDefaultEmpName) && (
                        <option value={resolvedDefaultEmpName}>{resolvedDefaultEmpName}</option>
                      )}
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.name}>
                          {emp.name} {emp.role ? `(${emp.role})` : ''}
                        </option>
                      ))}
                      <option value="custom">+ Ввести другое ФИО...</option>
                    </select>
                    {employeeName === 'custom' && (
                      <input
                        type="text"
                        placeholder="Введите ФИО сотрудника..."
                        onChange={(e) => setEmployeeName(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-blue-300 text-xs font-bold text-slate-900 outline-none"
                      />
                    )}
                  </div>
                ) : (
                  <input
                    type="text"
                    required
                    placeholder="ФИО сотрудника"
                    value={employeeName}
                    onChange={(e) => setEmployeeName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Примечание к обрезку</label>
                <input
                  type="text"
                  placeholder="Без сколов, спилен угол 45, деловой остаток..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-900 outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Зафиксировать этот обрезок</span>
            </button>
          </form>

          {/* Table of added offcuts in this modal */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black text-slate-700 uppercase tracking-wider">
                Внесенные обрезки по заказу ({offcutsList.length} шт):
              </span>
            </div>

            {offcutsList.length === 0 ? (
              <div className="p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-center text-xs text-slate-500">
                Нет внесенных обрезков. Если деловых обрезков не осталось, нажмите «Пропустить и завершить этап».
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {offcutsList.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900">
                        #{idx + 1} {item.materialName} ({item.thicknessMm}мм)
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
                        Размер: <strong className="text-blue-700">{item.lengthMm} × {item.widthMm} мм</strong> • {item.areaM2} м² • {item.quantity} шт • Ячейка: {item.storageCell}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Удалить обрезок"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={() => handleFinish(false)}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold cursor-pointer transition-colors"
          >
            Пропустить и завершить распил
          </button>

          <button
            type="button"
            onClick={() => handleFinish(true)}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Сохранить обрезки ({offcutsList.length}) и завершить этап</span>
          </button>
        </div>
      </div>
    </div>
  );
};

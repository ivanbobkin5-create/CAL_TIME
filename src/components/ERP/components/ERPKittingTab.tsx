import React, { useState } from 'react';
import { 
  Box, 
  Plus, 
  Trash2, 
  Printer, 
  CheckCircle2, 
  QrCode, 
  ArrowRight, 
  Sparkles, 
  Check, 
  Tag, 
  FileText,
  HelpCircle
} from 'lucide-react';
import { ProductionOrder, OrderPackage, ERPCompanySettings, ERPEmployee, ProductionStageId } from '../types';
import { PackageLabelPrintModal } from './PackageLabelPrintModal';

interface ERPKittingTabProps {
  order: ProductionOrder;
  settings?: ERPCompanySettings;
  currentUser?: ERPEmployee | null;
  onUpdateOrder: (updatedOrder: ProductionOrder) => void;
  onUpdateOrderStatus: (orderId: string, nextStage: ProductionStageId) => void;
}

export const ERPKittingTab: React.FC<ERPKittingTabProps> = ({
  order,
  settings,
  currentUser,
  onUpdateOrder,
  onUpdateOrderStatus
}) => {
  const existingPackages = order.packages || [];
  const kittingPackages = existingPackages.filter(p => p.type === 'kitting');
  const nextNumber = existingPackages.length + 1;

  const [packageName, setPackageName] = useState<string>(`Место ${nextNumber} (Фурнитура)`);
  const [itemsDescription, setItemsDescription] = useState<string>('');
  const [selectedPrintPkg, setSelectedPrintPkg] = useState<OrderPackage | null>(null);
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const quickPresets = [
    'Фурнитура (Blum)',
    'Фурнитура (Hettich / Boyard)',
    'Петли и доводчики',
    'Направляющие ящиков',
    'Крепеж, конфирматы, уголки',
    'Ручки мебельные и опоры',
    'Профиль Gola / Т-образный',
    'Стекло / Зеркала / Витраж',
    'Подсветка, трансформатор, проводка',
    'Инструкция и паспорт изделия'
  ];

  const handleCreateKittingPackage = () => {
    const cleanName = packageName.trim() || `Место ${nextNumber} (Фурнитура)`;
    const newPkgId = `pkg-kit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const uniqueCode = `PKG-${order.orderNumber}-KIT-${nextNumber}-${Date.now().toString().slice(-4)}`;

    const newPackage: OrderPackage = {
      id: newPkgId,
      orderId: order.id,
      orderNumber: order.orderNumber,
      packageNumber: nextNumber,
      name: cleanName,
      type: 'kitting',
      code: uniqueCode,
      parts: [],
      customItemsNote: itemsDescription.trim() || 'Комплект мебельной фурнитуры и крепежа',
      createdAt: new Date().toISOString(),
      createdByEmployeeId: currentUser?.id,
      createdByEmployeeName: currentUser?.name || 'Мастер комплектовки',
      isCompleted: true
    };

    const updatedPackages = [...existingPackages, newPackage];

    onUpdateOrder({
      ...order,
      packages: updatedPackages
    });

    setItemsDescription('');
    setPackageName(`Место ${updatedPackages.length + 1} (Фурнитура)`);
    setFeedbackMsg(`Упаковка "${cleanName}" создана!`);
    setTimeout(() => setFeedbackMsg(null), 3500);

    setSelectedPrintPkg(newPackage);
    setShowPrintModal(true);
  };

  const handleDeleteKittingPackage = (pkgId: string) => {
    if (!window.confirm('Удалить эту упаковку комплектации?')) return;

    const updatedPackages = existingPackages
      .filter(p => p.id !== pkgId)
      .map((p, idx) => ({ ...p, packageNumber: idx + 1 }));

    onUpdateOrder({
      ...order,
      packages: updatedPackages
    });
  };

  const handleCompleteKitting = () => {
    onUpdateOrderStatus(order.id, 'qc');
    setFeedbackMsg('Комплектация завершена! Заказ передан на ОТК / упаковку.');
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-cyan-600 uppercase tracking-wider mb-1">
              <Box className="w-4 h-4" /> Участок комплектовки
            </div>
            <h2 className="text-xl md:text-2xl font-black text-slate-900">
              Комплектация фурнитуры, крепежа и нестандартных мест
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Создавайте индивидуальные коробки с фурнитурой, печатайте наклейки с QR-кодами (120×75 мм) и прикрепляйте к упаковкам.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-cyan-50 border border-cyan-200 rounded-2xl px-4 py-2.5">
              <div className="text-[10px] font-bold text-cyan-700 uppercase">Сформировано мест комплектации</div>
              <div className="text-xl font-black text-cyan-950 font-mono">
                {kittingPackages.length} <span className="text-xs font-normal text-cyan-700">упак.</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {feedbackMsg && (
        <div className="p-4 rounded-2xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-2 shadow-md animate-fade-in">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Main Grid: Creator + Created List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Creator Form (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-3xl p-6 border-2 border-cyan-200 shadow-md space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 font-black text-slate-900 text-base">
                <Tag className="w-5 h-5 text-cyan-600" />
                <span>Новое место комплектации</span>
              </div>
              <span className="px-2.5 py-1 rounded-xl bg-cyan-100 text-cyan-800 text-xs font-black font-mono">
                Место №{nextNumber}
              </span>
            </div>

            {/* Package Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Наименование упаковки / коробки
              </label>
              <input
                type="text"
                value={packageName}
                onChange={(e) => setPackageName(e.target.value)}
                placeholder="например: Место 3 (Фурнитура Blum)"
                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 font-bold text-slate-900 text-xs focus:ring-2 focus:ring-cyan-500 outline-none"
              />
            </div>

            {/* Quick Presets */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">
                Быстрые шаблоны названий:
              </label>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                {quickPresets.map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setPackageName(`Место ${nextNumber} (${preset})`)}
                    className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-cyan-50 hover:text-cyan-900 text-slate-700 text-[10px] font-bold transition-colors cursor-pointer"
                  >
                    + {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Notes / Items specification */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Состав вложенной фурнитуры / примечание
              </label>
              <textarea
                value={itemsDescription}
                onChange={(e) => setItemsDescription(e.target.value)}
                placeholder="Перечислите что входит в коробку (петли, направляющие, стяжки, конфирматы, ручки и т.д.). Этот список распечатается на термоэтикетке."
                rows={4}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 font-medium text-slate-900 text-xs focus:ring-2 focus:ring-cyan-500 outline-none resize-none"
              />
            </div>

            {/* Button Create and Print */}
            <button
              onClick={handleCreateKittingPackage}
              className="w-full py-3 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs shadow-md shadow-cyan-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Создать упаковку и распечатать этикетку</span>
            </button>
          </div>
        </div>

        {/* Created Kitting Packages List (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
              <Box className="w-5 h-5 text-cyan-600" />
              <span>Сформированные места комплектации ({kittingPackages.length})</span>
            </h3>

            {kittingPackages.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs border-2 border-dashed border-slate-200 rounded-2xl">
                Пока не сформировано ни одной коробки комплектации. Создайте упаковку в форме слева.
              </div>
            ) : (
              <div className="space-y-3">
                {kittingPackages.map((pkg) => (
                  <div
                    key={pkg.id}
                    className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-cyan-600 text-white font-mono font-black text-sm flex items-center justify-center shrink-0">
                        M{pkg.packageNumber}
                      </div>

                      <div>
                        <div className="font-black text-slate-900 text-sm">
                          {pkg.name}
                        </div>
                        <div className="text-[11px] text-slate-600 font-mono mt-0.5">
                          {pkg.code}
                        </div>
                        {pkg.customItemsNote && (
                          <div className="text-xs text-slate-700 mt-1 bg-white p-2 rounded-xl border border-slate-200/70">
                            {pkg.customItemsNote}
                          </div>
                        )}
                        <div className="text-[10px] text-slate-400 mt-1">
                          Сформировал: {pkg.createdByEmployeeName || 'Комплектовщик'} • {pkg.createdAt ? new Date(pkg.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : ''}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        onClick={() => {
                          setSelectedPrintPkg(pkg);
                          setShowPrintModal(true);
                        }}
                        className="px-3 py-2 rounded-xl bg-white hover:bg-cyan-50 text-cyan-700 border border-slate-200 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Печать этикетки</span>
                      </button>

                      <button
                        onClick={() => handleDeleteKittingPackage(pkg.id)}
                        className="p-2 rounded-xl bg-white hover:bg-rose-50 text-rose-500 border border-slate-200 transition-colors cursor-pointer"
                        title="Удалить"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Complete Button */}
      <div className="p-6 rounded-3xl bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-1">
            Завершение комплектации
          </div>
          <div className="text-sm text-slate-300 font-medium">
            Сформировано {kittingPackages.length} коробок/мест с фурнитурой и комплектующими
          </div>
        </div>

        <button
          onClick={handleCompleteKitting}
          className="px-6 py-3.5 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs shadow-lg shadow-cyan-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Завершить комплектацию и передать далее</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Print Modal */}
      {selectedPrintPkg && (
        <PackageLabelPrintModal
          order={order}
          pkg={selectedPrintPkg}
          totalPackagesCount={existingPackages.length}
          settings={settings?.packageLabelSettings}
          isOpen={showPrintModal}
          onClose={() => {
            setShowPrintModal(false);
            setSelectedPrintPkg(null);
          }}
        />
      )}
    </div>
  );
};

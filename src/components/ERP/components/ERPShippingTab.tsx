import React, { useState, useEffect, useRef } from 'react';
import { 
  Truck, 
  QrCode, 
  CheckCircle2, 
  AlertTriangle, 
  Camera, 
  Package, 
  UserCheck, 
  Phone, 
  FileText, 
  Sparkles, 
  Archive, 
  Layers, 
  Check, 
  X,
  Printer,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { ProductionOrder, OrderPackage, ERPCompanySettings, ERPEmployee, DriverInfo, ProductionStageId } from '../types';
import { PackageLabelPrintModal } from './PackageLabelPrintModal';
import { ShippingActPrintModal } from './ShippingActPrintModal';
import { ShippingTTNPrintModal } from './ShippingTTNPrintModal';
import { QuickAddDriverModal } from './QuickAddDriverModal';
import { convertRuCharToEn, convertRuToEnLayout, normalizeBarcodeScan, matchPackageToScannedCode } from '../utils';

interface ERPShippingTabProps {
  order: ProductionOrder;
  settings?: ERPCompanySettings;
  currentUser?: ERPEmployee | null;
  employees?: ERPEmployee[];
  onUpdateOrder: (updatedOrder: ProductionOrder) => void;
  onUpdateOrderStatus: (orderId: string, nextStage: ProductionStageId) => void;
  onOpenScannerModal?: () => void;
  onAddEmployee?: (emp: Partial<ERPEmployee>) => void;
}

export const ERPShippingTab: React.FC<ERPShippingTabProps> = ({
  order,
  settings,
  currentUser,
  employees = [],
  onUpdateOrder,
  onUpdateOrderStatus,
  onOpenScannerModal,
  onAddEmployee
}) => {
  const allPackages = order.packages || [];
  const [scannedPackageIds, setScannedPackageIds] = useState<string[]>(() => {
    return allPackages.filter(p => p.isShipped).map(p => p.id);
  });

  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [driverName, setDriverName] = useState<string>(order.driverInfo?.driverName || '');
  const [carPlate, setCarPlate] = useState<string>(order.driverInfo?.carPlate || '');
  const [driverPhone, setDriverPhone] = useState<string>(order.driverInfo?.phone || '');
  const [shippingNote, setShippingNote] = useState<string>(order.driverInfo?.note || '');

  const [scanInput, setScanInput] = useState<string>('');
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [selectedPrintPkg, setSelectedPrintPkg] = useState<OrderPackage | null>(null);
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);
  const [showActModal, setShowActModal] = useState<boolean>(false);
  const [showTTNModal, setShowTTNModal] = useState<boolean>(false);
  const [showQuickAddDriverModal, setShowQuickAddDriverModal] = useState<boolean>(false);
  const [expandedPkgId, setExpandedPkgId] = useState<string | null>(null);

  const scannerInputRef = useRef<HTMLInputElement | null>(null);
  const barcodeBufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  const totalPackagesCount = allPackages.length;
  const scannedCount = scannedPackageIds.length;
  const isAllPackagesScanned = totalPackagesCount > 0 && scannedCount >= totalPackagesCount;
  const isAlreadyShipped = order.status === 'shipped' || order.currentStage === 'ready';

  const showFeedback = (text: string, type: 'success' | 'error' | 'info') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => {
      setFeedbackMsg(null);
    }, 4500);
  };

  // Toggle single package scanned/shipped state
  const handleTogglePackageScanned = (pkgId: string) => {
    const pkg = allPackages.find(p => p.id === pkgId);
    if (!pkg) return;

    if (scannedPackageIds.includes(pkgId)) {
      setScannedPackageIds(prev => prev.filter(id => id !== pkgId));
      showFeedback(`Место "${pkg.name}" снято с погрузки`, 'info');
    } else {
      setScannedPackageIds(prev => [...prev, pkgId]);
      showFeedback(`Место "${pkg.name}" отсканировано и погружено!`, 'success');
    }
  };

  // Scan package code handler
  const handleScanPackageCode = (code: string) => {
    setScanInput('');
    barcodeBufferRef.current = '';
    if (scannerInputRef.current) {
      scannerInputRef.current.value = '';
    }

    if (!code || !code.trim()) return;

    const foundPkg = allPackages.find(p => matchPackageToScannedCode(code, p, order));

    if (!foundPkg) {
      showFeedback(`Упаковка с QR-кодом / штрихкодом "${code}" не найдена в этом заказе!`, 'error');
      return;
    }

    if (scannedPackageIds.includes(foundPkg.id)) {
      showFeedback(`Место №${foundPkg.packageNumber} ("${foundPkg.name}") уже было отсканировано ранее.`, 'info');
      return;
    }

    setScannedPackageIds(prev => [...prev, foundPkg.id]);
    showFeedback(`Место №${foundPkg.packageNumber} ("${foundPkg.name}") успешно отсканировано и погружено!`, 'success');
  };

  // Hardware Scanner Listener
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (showPrintModal) return;

      const activeEl = document.activeElement as HTMLElement | null;
      const target = e.target as HTMLElement | null;
      const isScannerInput = target === scannerInputRef.current || activeEl === scannerInputRef.current;

      const isOtherInput = (target && (
        (target.tagName === 'INPUT' && target !== scannerInputRef.current) ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      )) || (activeEl && (
        (activeEl.tagName === 'INPUT' && activeEl !== scannerInputRef.current) ||
        activeEl.tagName === 'TEXTAREA' ||
        activeEl.tagName === 'SELECT' ||
        activeEl.isContentEditable
      ));

      if (isOtherInput) return;

      if (e.key === 'Enter') {
        const rawCode = isScannerInput
          ? (scanInput.trim() || (scannerInputRef.current?.value || '').trim())
          : (barcodeBufferRef.current.trim() || scanInput.trim() || (scannerInputRef.current?.value || '').trim());
        const bufferedCode = normalizeBarcodeScan(rawCode);
        if (bufferedCode) {
          e.preventDefault();
          barcodeBufferRef.current = '';
          handleScanPackageCode(bufferedCode);
        }
        return;
      }

      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        if (isScannerInput) {
          return;
        }

        const now = Date.now();
        if (now - lastKeyTimeRef.current > 1200) {
          barcodeBufferRef.current = '';
        }
        lastKeyTimeRef.current = now;
        barcodeBufferRef.current += e.key;

        setScanInput(barcodeBufferRef.current);
        scannerInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown, true);
    };
  }, [showPrintModal, scanInput, scannedPackageIds, allPackages]);

  // Complete Shipping -> Archive Order
  const handleFinalizeShipment = () => {
    if (!isAllPackagesScanned && allPackages.length > 0) {
      const missingCount = allPackages.length - scannedPackageIds.length;
      showFeedback(`Невозможно отгрузить: еще не отсканировано ${missingCount} мест!`, 'error');
      return;
    }

    const driverInfo: DriverInfo = {
      driverName: driverName.trim() || 'Водитель доставки',
      carPlate: carPlate.trim(),
      phone: driverPhone.trim(),
      note: shippingNote.trim()
    };

    const updatedPackages = allPackages.map(p => ({
      ...p,
      isShipped: true,
      shippedAt: new Date().toISOString(),
      shippedByEmployeeName: currentUser?.name || 'Экспедитор'
    }));

    const updatedOrder: ProductionOrder = {
      ...order,
      status: 'shipped',
      currentStage: 'ready',
      packages: updatedPackages,
      shippedAt: new Date().toISOString(),
      shippedByEmployeeId: currentUser?.id,
      shippedByEmployeeName: currentUser?.name || 'Экспедитор',
      driverInfo: driverInfo,
      stageProgress: {
        ...(order.stageProgress || {}),
        shipping: {
          status: 'done',
          completedAt: new Date().toISOString(),
          completedBy: currentUser?.name || 'Экспедитор'
        },
        ready: {
          status: 'done',
          completedAt: new Date().toISOString(),
          completedBy: currentUser?.name || 'Экспедитор'
        }
      }
    };

    onUpdateOrder(updatedOrder);
    onUpdateOrderStatus(order.id, 'ready');
    showFeedback('Заказ успешно отгружен водителю и перемещен в архив!', 'success');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-violet-600 uppercase tracking-wider mb-1">
              <Truck className="w-4 h-4" /> Участок отгрузки и передача водителю
            </div>
            <h2 className="text-xl md:text-2xl font-black text-slate-900">
              Контроль погрузки мест и передача заказа водителю
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Сканируйте QR-коды на коробках при погрузке в кузов. Система проверит полноту комплекта перед отправкой в архив.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="bg-violet-50 border border-violet-200 rounded-2xl px-4 py-2.5">
              <div className="text-[10px] font-bold text-violet-700 uppercase">Всего мест к отгрузке</div>
              <div className="text-xl font-black text-violet-950 font-mono">
                {totalPackagesCount} <span className="text-xs font-normal text-violet-700">упак.</span>
              </div>
            </div>

            <div className={`border rounded-2xl px-4 py-2.5 ${isAllPackagesScanned ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-amber-50 border-amber-200 text-amber-900'}`}>
              <div className="text-[10px] font-bold uppercase">Погружено в машину</div>
              <div className="text-xl font-black font-mono">
                {scannedCount} / {totalPackagesCount}
                <span className="text-xs font-bold ml-1.5 opacity-75">
                  ({totalPackagesCount > 0 ? Math.round((scannedCount / totalPackagesCount) * 100) : 0}%)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="mt-6 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600 mb-1.5">
            <span>Прогресс погрузки заказа {order.orderNumber}</span>
            <span>{totalPackagesCount > 0 ? Math.round((scannedCount / totalPackagesCount) * 100) : 0}%</span>
          </div>
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isAllPackagesScanned ? 'bg-emerald-500' : 'bg-gradient-to-r from-violet-500 to-indigo-500'
              }`}
              style={{
                width: `${totalPackagesCount > 0 ? (scannedCount / totalPackagesCount) * 100 : 0}%`
              }}
            />
          </div>
        </div>
      </div>

      {/* Live Feedback Toast */}
      {feedbackMsg && (
        <div
          className={`p-4 rounded-2xl font-bold text-xs flex items-center justify-between gap-3 shadow-md animate-fade-in ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-600 text-white'
              : feedbackMsg.type === 'error'
              ? 'bg-rose-600 text-white animate-shake'
              : 'bg-indigo-600 text-white'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedbackMsg.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 shrink-0" />
            ) : feedbackMsg.type === 'error' ? (
              <AlertTriangle className="w-5 h-5 shrink-0" />
            ) : (
              <Sparkles className="w-5 h-5 shrink-0" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
          <button onClick={() => setFeedbackMsg(null)} className="p-1 hover:bg-black/10 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Grid: Packages Checklist & Driver Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: QR Scanner Box & Packages List (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Hardware Barcode & Camera Scanner Bar */}
          <div className="p-4 bg-slate-900 text-white rounded-3xl border border-slate-800 shadow-md space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 font-bold text-violet-400">
                <QrCode className="w-4 h-4" /> Сканирование этикеток упаковок (QR / Штрихкод)
              </span>
              {onOpenScannerModal && (
                <button
                  onClick={onOpenScannerModal}
                  className="px-2.5 py-1 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  title="Сканировать камерой"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Сканировать</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                ref={scannerInputRef}
                type="text"
                lang="en"
                inputMode="text"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                value={scanInput}
                onChange={(e) => setScanInput(convertRuToEnLayout(e.target.value))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleScanPackageCode(scanInput);
                  }
                }}
                placeholder="Отсканируйте QR-код на коробке или введите номер места (например: M1)..."
                className="flex-1 px-4 py-2.5 rounded-2xl bg-slate-800 border border-slate-700 text-white font-mono font-bold text-xs focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              <button
                type="button"
                onClick={() => handleScanPackageCode(scanInput)}
                className="px-5 py-2.5 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs transition-colors cursor-pointer"
              >
                Подтвердить
              </button>
            </div>
            <div className="text-[10px] text-slate-400">
              * Слушатель сканера активен: вы можете подносить сканер к QR-наклейкам в любой момент.
            </div>
          </div>

          {/* Prepared Packages Checklist */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                <Package className="w-5 h-5 text-violet-600" />
                <span>Чек-лист передачи упаковок водителю</span>
              </h3>
              <span className="text-xs font-bold text-slate-500 font-mono">
                {scannedCount} из {totalPackagesCount} погружено
              </span>
            </div>

            {allPackages.length === 0 ? (
              <div className="p-8 text-center bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-xs space-y-2">
                <AlertTriangle className="w-8 h-8 text-amber-600 mx-auto" />
                <div className="font-bold text-sm">В заказе еще не сформированы упаковки!</div>
                <div>Перейдите на участок "Упаковка" или "Комплектация" и сформируйте места с QR-этикетками.</div>
              </div>
            ) : (
              <div className="space-y-3">
                {allPackages.map(pkg => {
                  const isScanned = scannedPackageIds.includes(pkg.id);
                  const isExpanded = expandedPkgId === pkg.id;

                  return (
                    <div
                      key={pkg.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        isScanned
                          ? 'bg-emerald-50/70 border-emerald-300 shadow-sm'
                          : 'bg-white border-slate-200 hover:border-violet-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div
                          onClick={() => handleTogglePackageScanned(pkg.id)}
                          className="flex items-start gap-3 flex-1 cursor-pointer select-none"
                        >
                          <div
                            className={`w-10 h-10 rounded-2xl font-black font-mono text-sm flex items-center justify-center shrink-0 transition-colors ${
                              isScanned
                                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {isScanned ? <Check className="w-5 h-5" /> : `M${pkg.packageNumber}`}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-black text-slate-900 text-sm">
                                {pkg.name}
                              </span>
                              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold ${
                                pkg.type === 'kitting' ? 'bg-cyan-100 text-cyan-800' : 'bg-orange-100 text-orange-800'
                              }`}>
                                {pkg.type === 'kitting' ? 'Комплектация' : `${pkg.parts.length} дет.`}
                              </span>
                            </div>

                            <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                              Код: <strong className="text-slate-700">{pkg.code}</strong>
                            </div>

                            {pkg.customItemsNote && (
                              <div className="text-[11px] text-slate-600 mt-1 bg-white/80 p-1.5 rounded-lg border border-slate-200">
                                {pkg.customItemsNote}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => {
                              setSelectedPrintPkg(pkg);
                              setShowPrintModal(true);
                            }}
                            className="p-2 rounded-xl bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 transition-colors"
                            title="Печать повторной этикетки"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleTogglePackageScanned(pkg.id)}
                            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer ${
                              isScanned
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-100 hover:bg-violet-100 text-slate-700'
                            }`}
                          >
                            {isScanned ? <Check className="w-3.5 h-3.5" /> : <QrCode className="w-3.5 h-3.5 text-violet-600" />}
                            <span>{isScanned ? 'Погружено' : 'Отметить'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Expand Details list */}
                      {pkg.parts && pkg.parts.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-slate-200/60">
                          <button
                            onClick={() => setExpandedPkgId(isExpanded ? null : pkg.id)}
                            className="text-[10px] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1"
                          >
                            <span>{isExpanded ? 'Скрыть вложенные детали' : `Показать состав (${pkg.parts.length} дет.)`}</span>
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>

                          {isExpanded && (
                            <div className="mt-2 max-h-36 overflow-y-auto space-y-1">
                              {pkg.parts.map((p, idx) => (
                                <div key={idx} className="flex items-center justify-between p-1 bg-white rounded text-[10px] font-medium">
                                  <span>{p.labelNumber} {p.name}</span>
                                  <span className="font-mono text-slate-500">{p.length}×{p.width} мм</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Driver & Dispatch Info Form (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl p-6 border-2 border-violet-200 shadow-md space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 font-black text-slate-900 text-base">
                <UserCheck className="w-5 h-5 text-violet-600" />
                <span>Данные водителя и путевого листа</span>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickAddDriverModal(true)}
                className="px-2.5 py-1 rounded-xl bg-violet-100 hover:bg-violet-200 text-violet-800 text-[11px] font-bold transition-all cursor-pointer"
              >
                + Добавить
              </button>
            </div>

            {/* Select Driver from Employees List */}
            {employees.length > 0 && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Выбрать водителя из справочника сотрудников
                </label>
                <select
                  value={selectedDriverId}
                  onChange={(e) => {
                    const empId = e.target.value;
                    setSelectedDriverId(empId);
                    if (empId === 'NEW') {
                      setShowQuickAddDriverModal(true);
                      return;
                    }
                    const emp = employees.find(m => m.id === empId);
                    if (emp) {
                      setDriverName(emp.name);
                      setCarPlate(emp.carPlate || emp.carModel || carPlate);
                      setDriverPhone(emp.phone || driverPhone);
                    }
                  }}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-violet-50/70 border border-violet-200 font-bold text-violet-950 text-xs focus:ring-2 focus:ring-violet-500 outline-none"
                >
                  <option value="">-- Выберите водителя / курьера --</option>
                  {employees
                    .filter(e => e.status === 'active')
                    .map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.productionRole || emp.role || 'Сотрудник'}) {emp.employmentType === 'outsource' ? '[Аутсорс]' : ''} {emp.carPlate ? `[${emp.carPlate}]` : ''}
                      </option>
                    ))}
                  <option value="NEW">+ Добавить нового водителя в базу...</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ФИО Водителя / Экспедитора *
              </label>
              <input
                type="text"
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                placeholder="например: Сидоров Сергей Михайлович"
                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 font-bold text-slate-900 text-xs focus:ring-2 focus:ring-violet-500 outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Госномер автомобиля
                </label>
                <input
                  type="text"
                  value={carPlate}
                  onChange={(e) => setCarPlate(e.target.value)}
                  placeholder="А 123 ВС 777"
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 font-mono font-bold text-slate-900 text-xs focus:ring-2 focus:ring-violet-500 outline-none uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Телефон водителя
                </label>
                <input
                  type="text"
                  value={driverPhone}
                  onChange={(e) => setDriverPhone(e.target.value)}
                  placeholder="+7 (999) 000-00-00"
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 font-bold text-slate-900 text-xs focus:ring-2 focus:ring-violet-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Номер ТТН / Примечание к доставке
              </label>
              <textarea
                value={shippingNote}
                onChange={(e) => setShippingNote(e.target.value)}
                placeholder="Адрес доставки, подъем на этаж, время прибытия или контакты клиента..."
                rows={2}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 font-medium text-slate-900 text-xs focus:ring-2 focus:ring-violet-500 outline-none resize-none"
              />
            </div>

            {/* Print Documents Block */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Печать документов на А4</div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setShowActModal(true)}
                  className="px-3 py-2.5 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Акт приема (А4)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowTTNModal(true)}
                  className="px-3 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Накладная ТТН</span>
                </button>
              </div>
            </div>

            {/* Client & Project summary */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Данные получателя</div>
              <div className="font-bold text-slate-900">{order.clientName}</div>
              <div className="text-slate-600">{order.projectName}</div>
            </div>
          </div>

          {/* Final Shipment Action Card */}
          <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2 text-violet-400 font-bold text-xs uppercase tracking-wider">
              <Archive className="w-4 h-4" /> Закрытие заказа и перемещение в архив
            </div>

            <div className="text-xs text-slate-300 leading-relaxed">
              После завершения отгрузки заказ будет помечен как <strong>"Отгружен"</strong> и отправлен в архив. В любой момент вы сможете открыть его в истории, чтобы просмотреть все производственные сессии (кто пилил, кромковал, сверлил) и структуру упакованных мест.
            </div>

            <button
              onClick={handleFinalizeShipment}
              disabled={!isAllPackagesScanned && allPackages.length > 0}
              className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-sm shadow-xl shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Truck className="w-5 h-5" />
              <span>Завершить отгрузку и отправить в архив</span>
            </button>
          </div>
        </div>
      </div>

      {/* Package Label Print Modal */}
      {selectedPrintPkg && (
        <PackageLabelPrintModal
          order={order}
          pkg={selectedPrintPkg}
          totalPackagesCount={allPackages.length}
          settings={settings?.packageLabelSettings}
          isOpen={showPrintModal}
          onClose={() => {
            setShowPrintModal(false);
            setSelectedPrintPkg(null);
          }}
        />
      )}

      {/* A4 Shipping Acceptance Act Print Modal */}
      <ShippingActPrintModal
        isOpen={showActModal}
        onClose={() => setShowActModal(false)}
        order={{
          ...order,
          driverInfo: {
            driverName: driverName || order.driverInfo?.driverName || '',
            carPlate: carPlate || order.driverInfo?.carPlate || '',
            phone: driverPhone || order.driverInfo?.phone || '',
            note: shippingNote
          }
        }}
        settings={settings}
      />

      {/* A4 Transport Waybill (TTN) Print Modal */}
      <ShippingTTNPrintModal
        isOpen={showTTNModal}
        onClose={() => setShowTTNModal(false)}
        order={{
          ...order,
          driverInfo: {
            driverName: driverName || order.driverInfo?.driverName || '',
            carPlate: carPlate || order.driverInfo?.carPlate || '',
            phone: driverPhone || order.driverInfo?.phone || '',
            note: shippingNote
          }
        }}
        settings={settings}
      />

      {/* Quick Add Driver Modal */}
      <QuickAddDriverModal
        isOpen={showQuickAddDriverModal}
        onClose={() => setShowQuickAddDriverModal(false)}
        onAddDriver={(newDriver) => {
          if (onAddEmployee) {
            onAddEmployee(newDriver);
          }
          if (newDriver.name) setDriverName(newDriver.name);
          if (newDriver.carPlate || newDriver.carModel) {
            setCarPlate(`${newDriver.carModel ? newDriver.carModel + ' ' : ''}${newDriver.carPlate || ''}`);
          }
          if (newDriver.phone) setDriverPhone(newDriver.phone);
          showFeedback(`Водитель "${newDriver.name}" добавлен и сохранен в базе!`, 'success');
        }}
      />
    </div>
  );
};

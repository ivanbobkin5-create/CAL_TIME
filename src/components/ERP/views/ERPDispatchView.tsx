import React, { useState, useRef, useEffect } from 'react';
import { 
  Truck, 
  Search, 
  PackageCheck, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  User, 
  MapPin, 
  Phone, 
  Printer, 
  FileText, 
  Camera, 
  QrCode, 
  ChevronRight, 
  ArrowRight, 
  X, 
  Plus, 
  Calendar, 
  DollarSign, 
  ShieldCheck, 
  Sparkles,
  Check,
  Building2,
  Box
} from 'lucide-react';
import { ProductionOrder, ERPEmployee, ERPCompanySettings, OrderPackage, DriverInfo } from '../types';
import { MobileCameraScannerModal } from '../components/MobileCameraScannerModal';
import { speakText, normalizeBarcodeScan, matchPackageToScannedCode } from '../utils';

interface ERPDispatchViewProps {
  orders: ProductionOrder[];
  employees: ERPEmployee[];
  settings?: ERPCompanySettings;
  companyName?: string;
  onUpdateOrder: (updatedOrder: ProductionOrder) => void;
  onSelectOrder?: (order: ProductionOrder) => void;
}

export const ERPDispatchView: React.FC<ERPDispatchViewProps> = ({
  orders,
  employees,
  settings,
  companyName = 'Мебельное производство',
  onUpdateOrder,
  onSelectOrder
}) => {
  const [search, setSearch] = useState('');
  const [tabFilter, setTabFilter] = useState<'ready' | 'shipped' | 'all'>('ready');
  const [selectedOrderForDispatch, setSelectedOrderForDispatch] = useState<ProductionOrder | null>(null);
  const [selectedOrderForPrintDoc, setSelectedOrderForPrintDoc] = useState<{ order: ProductionOrder; docType: 'act' | 'ttn' | 'sticker' } | null>(null);

  // Filter dispatch candidate orders:
  // Orders that reached 'shipping', 'ready', 'packing' or completed status
  const dispatchOrders = orders.filter(order => {
    if (order.isDeleted) return false;

    const isDispatchCandidate = 
      order.currentStage === 'shipping' || 
      order.currentStage === 'ready' || 
      order.currentStage === 'packing' ||
      order.status === 'shipped' ||
      order.status === 'completed' ||
      (order.packages && order.packages.length > 0);

    if (!isDispatchCandidate) return false;

    // Filter by tab
    if (tabFilter === 'ready' && (order.status === 'shipped' || order.status === 'completed')) return false;
    if (tabFilter === 'shipped' && order.status !== 'shipped' && order.status !== 'completed') return false;

    // Filter by search query
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      order.orderNumber.toLowerCase().includes(q) ||
      order.clientName.toLowerCase().includes(q) ||
      order.projectName.toLowerCase().includes(q) ||
      (order.deliveryData?.address && order.deliveryData.address.toLowerCase().includes(q)) ||
      (order.driverInfo?.driverName && order.driverInfo.driverName.toLowerCase().includes(q))
    );
  });

  // Calculate statistics
  const readyOrdersCount = orders.filter(o => !o.isDeleted && (o.currentStage === 'shipping' || o.currentStage === 'ready') && o.status !== 'shipped' && o.status !== 'completed').length;
  const shippedTodayCount = orders.filter(o => !o.isDeleted && o.shippedAt && o.shippedAt.startsWith(new Date().toISOString().split('T')[0])).length;
  const totalPackagesToShip = dispatchOrders.reduce((sum, o) => sum + (o.packages?.length || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Header Banner */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">
            <Truck className="w-4 h-4" /> Участок отгрузки и готовой продукции
          </div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900">
            Передача заказов клиентам и логистика
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Сканирование всех упаковок и мест, назначение водителя, формирование Актов приема-передачи и ТТН
          </p>
        </div>

        {/* Quick KPI Counters */}
        <div className="flex items-center gap-3">
          <div className="bg-emerald-50 rounded-2xl px-4 py-2.5 border border-emerald-200/80 text-center">
            <div className="text-[10px] font-bold text-emerald-700 uppercase">Готовы к отгрузке</div>
            <div className="text-xl font-black text-emerald-900">{readyOrdersCount} <span className="text-xs font-normal">зак.</span></div>
          </div>

          <div className="bg-blue-50 rounded-2xl px-4 py-2.5 border border-blue-200/80 text-center">
            <div className="text-[10px] font-bold text-blue-700 uppercase">Отгружено сегодня</div>
            <div className="text-xl font-black text-blue-900">{shippedTodayCount} <span className="text-xs font-normal">зак.</span></div>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Tab Switcher */}
        <div className="flex items-center p-1 bg-slate-100 rounded-2xl border border-slate-200 w-full md:w-auto">
          <button
            onClick={() => setTabFilter('ready')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              tabFilter === 'ready' 
                ? 'bg-white text-slate-900 shadow-sm' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Готовы к отгрузке ({readyOrdersCount})
          </button>

          <button
            onClick={() => setTabFilter('shipped')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              tabFilter === 'shipped' 
                ? 'bg-white text-slate-900 shadow-sm' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Отгруженные заказы
          </button>

          <button
            onClick={() => setTabFilter('all')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              tabFilter === 'all' 
                ? 'bg-white text-slate-900 shadow-sm' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Все
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Заказ, клиент, адрес или водитель..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Orders Grid */}
      {dispatchOrders.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-200/80 shadow-sm text-center space-y-3">
          <div className="w-16 h-16 rounded-3xl bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-slate-400">
            <PackageCheck className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Заказы для отгрузки не найдены</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Заказы автоматически появляются на этом участке после того, как они проходят этап упаковки и контроля качества в цехе.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {dispatchOrders.map((order) => {
            const pkgs = order.packages || [];
            const shippedPkgsCount = pkgs.filter(p => p.isShipped).length;
            const isFullyScanned = pkgs.length > 0 && shippedPkgsCount === pkgs.length;
            const isShipped = order.status === 'shipped' || order.status === 'completed';

            return (
              <div
                key={order.id}
                className={`bg-white rounded-3xl border transition-all duration-200 p-5 shadow-sm flex flex-col justify-between ${
                  isShipped
                    ? 'border-emerald-200 bg-emerald-50/20'
                    : isFullyScanned
                    ? 'border-blue-300 ring-2 ring-blue-500/20'
                    : 'border-slate-200/80 hover:border-slate-300'
                }`}
              >
                <div>
                  {/* Card Top Badge Header */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="px-2.5 py-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-mono font-black text-slate-800">
                      #{order.orderNumber}
                    </span>

                    <span className={`px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1 ${
                      isShipped
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : isFullyScanned
                        ? 'bg-blue-100 text-blue-800 border border-blue-300'
                        : 'bg-amber-100 text-amber-800 border border-amber-300'
                    }`}>
                      {isShipped ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" /> Отгружен
                        </>
                      ) : isFullyScanned ? (
                        <>
                          <ShieldCheck className="w-3.5 h-3.5" /> Все места проверены
                        </>
                      ) : (
                        <>
                          <Clock className="w-3.5 h-3.5" /> Ожидает проверки мест
                        </>
                      )}
                    </span>
                  </div>

                  {/* Client & Project Info */}
                  <div className="space-y-1 mb-3">
                    <h4 className="font-bold text-sm text-slate-900 line-clamp-1">{order.clientName}</h4>
                    <p className="text-xs text-slate-500 font-medium line-clamp-1">{order.projectName}</p>
                    {order.deliveryData?.address && (
                      <div className="text-[11px] text-slate-600 font-medium flex items-center gap-1 mt-1 truncate">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{order.deliveryData.address}</span>
                      </div>
                    )}
                  </div>

                  {/* Packaging Places Counter & Progress Bar */}
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 mb-4">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                      <span className="flex items-center gap-1.5">
                        <Box className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Упаковочные места:</span>
                      </span>
                      <span className="font-mono">{pkgs.length > 0 ? `${shippedPkgsCount} / ${pkgs.length}` : 'Не сформированы'}</span>
                    </div>

                    {pkgs.length > 0 && (
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            isFullyScanned || isShipped ? 'bg-emerald-500' : 'bg-blue-600'
                          }`}
                          style={{ width: `${Math.round((shippedPkgsCount / pkgs.length) * 100)}%` }}
                        />
                      </div>
                    )}

                    {/* Driver details if assigned */}
                    {order.driverInfo?.driverName && (
                      <div className="pt-2 border-t border-slate-200/60 text-[11px] text-slate-600 flex items-center justify-between">
                        <span className="font-medium text-slate-500">Водитель:</span>
                        <span className="font-bold text-slate-900 truncate">{order.driverInfo.driverName} {order.driverInfo.carPlate ? `(${order.driverInfo.carPlate})` : ''}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setSelectedOrderForPrintDoc({ order, docType: 'act' })}
                    className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Печать Акта приема-передачи"
                  >
                    <Printer className="w-4 h-4 text-slate-600" />
                    <span className="hidden sm:inline">Акт А4</span>
                  </button>

                  <button
                    onClick={() => setSelectedOrderForDispatch(order)}
                    className={`flex-1 py-2.5 px-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm ${
                      isShipped
                        ? 'bg-slate-900 hover:bg-slate-800 text-white'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                    }`}
                  >
                    <Truck className="w-4 h-4" />
                    <span>{isShipped ? 'Просмотр отгрузки' : 'Начать отгрузку'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DISPATCH WORKSTATION MODAL */}
      {selectedOrderForDispatch && (
        <ERPDispatchWorkspaceModal
          order={selectedOrderForDispatch}
          employees={employees}
          settings={settings}
          companyName={companyName}
          onClose={() => setSelectedOrderForDispatch(null)}
          onUpdateOrder={(updated) => {
            onUpdateOrder(updated);
            setSelectedOrderForDispatch(updated);
          }}
          onPrintAct={(ord) => {
            setSelectedOrderForPrintDoc({ order: ord, docType: 'act' });
          }}
        />
      )}

      {/* PRINTABLE DOCUMENT MODAL (A4 Act of Acceptance / TTN) */}
      {selectedOrderForPrintDoc && (
        <PrintableShippingDocumentModal
          order={selectedOrderForPrintDoc.order}
          docType={selectedOrderForPrintDoc.docType}
          companyName={companyName}
          onClose={() => setSelectedOrderForPrintDoc(null)}
        />
      )}
    </div>
  );
};

// ----------------------------------------------------------------------
// DISPATCH WORKSTATION MODAL (Scanning Packages & Driver Logistics)
// ----------------------------------------------------------------------

interface ERPDispatchWorkspaceModalProps {
  order: ProductionOrder;
  employees: ERPEmployee[];
  settings?: ERPCompanySettings;
  companyName: string;
  onClose: () => void;
  onUpdateOrder: (updated: ProductionOrder) => void;
  onPrintAct: (ord: ProductionOrder) => void;
}

const ERPDispatchWorkspaceModal: React.FC<ERPDispatchWorkspaceModalProps> = ({
  order,
  employees,
  companyName,
  onClose,
  onUpdateOrder,
  onPrintAct
}) => {
  const pkgs = order.packages || [];
  const [scannedCodes, setScannedCodes] = useState<string[]>(() => {
    return pkgs.filter(p => p.isShipped).map(p => p.code);
  });
  const [scanInput, setScanInput] = useState('');
  const [scanMessage, setScanMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const scannerInputRef = useRef<HTMLInputElement>(null);
  const barcodeBufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  // Driver & Vehicle form
  const [driverName, setDriverName] = useState(order.driverInfo?.driverName || '');
  const [carPlate, setCarPlate] = useState(order.driverInfo?.carPlate || '');
  const [driverPhone, setDriverPhone] = useState(order.driverInfo?.phone || '');
  const [clientAddress, setClientAddress] = useState(order.deliveryData?.address || '');
  const [clientPhone, setClientPhone] = useState(order.deliveryData?.clientPhone || '');
  const [deliveryPrice, setDeliveryPrice] = useState<number>(order.deliveryData?.deliveryPrice || 0);

  // Handle Scan package code
  const handleScanPackageCode = (rawCode: string) => {
    if (!rawCode || !rawCode.trim()) return;

    // Find package matching code
    const matchingPkg = pkgs.find(p => matchPackageToScannedCode(rawCode, p, order));

    if (!matchingPkg) {
      setScanMessage({ type: 'error', text: `Штрихкод / место "${rawCode}" не найдено в упаковочных местах этого заказа!` });
      speakText('Ошибка штрихкода');
      return;
    }

    const isAlreadyScanned = scannedCodes.includes(matchingPkg.id) || scannedCodes.includes(matchingPkg.code) || matchingPkg.isShipped;

    if (isAlreadyScanned) {
      setScanMessage({ type: 'success', text: `Место №${matchingPkg.packageNumber} ("${matchingPkg.name}") уже было отсканировано!` });
      return;
    }

    const nextCodes = Array.from(new Set([...scannedCodes, matchingPkg.id, matchingPkg.code]));
    setScannedCodes(nextCodes);
    setScanMessage({ type: 'success', text: `Место №${matchingPkg.packageNumber} (${matchingPkg.name}) отсканировано!` });
    speakText(`Место ${matchingPkg.packageNumber} принято`);

    // Auto update packages status in order
    const updatedPkgs = pkgs.map(p => (p.id === matchingPkg.id || p.code === matchingPkg.code) ? { ...p, isShipped: true, shippedAt: new Date().toISOString() } : p);
    onUpdateOrder({ ...order, packages: updatedPkgs });
  };

  const handleScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanInput.trim()) return;
    handleScanPackageCode(scanInput.trim());
    setScanInput('');
  };

  // Hardware Scanner Listener
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (showCameraScanner) return;

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
        if (rawCode) {
          e.preventDefault();
          barcodeBufferRef.current = '';
          handleScanPackageCode(rawCode);
          setScanInput('');
          if (scannerInputRef.current) scannerInputRef.current.value = '';
        }
        return;
      }

      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        if (isScannerInput) return;

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
  }, [showCameraScanner, scanInput, scannedCodes, pkgs, order]);

  // Toggle all packages scanned manually
  const handleScanAllManually = () => {
    const allCodes = pkgs.map(p => p.code);
    setScannedCodes(allCodes);
    const updatedPkgs = pkgs.map(p => ({ ...p, isShipped: true, shippedAt: new Date().toISOString() }));
    onUpdateOrder({ ...order, packages: updatedPkgs });
    setScanMessage({ type: 'success', text: 'Все упаковки отмечены как отсканированные' });
    speakText('Все места приняты');
  };

  // Complete shipment
  const handleConfirmShipment = () => {
    const updatedPkgs = pkgs.map(p => ({ ...p, isShipped: true, shippedAt: p.shippedAt || new Date().toISOString() }));
    
    const updatedOrder: ProductionOrder = {
      ...order,
      currentStage: 'ready',
      status: 'shipped',
      shippedAt: new Date().toISOString(),
      packages: updatedPkgs,
      driverInfo: {
        driverName: driverName || 'Собственная доставка',
        carPlate: carPlate,
        phone: driverPhone
      },
      deliveryData: {
        ...order.deliveryData,
        address: clientAddress,
        clientPhone: clientPhone,
        deliveryPrice: deliveryPrice
      },
      stageProgress: {
        ...(order.stageProgress || {}),
        shipping: {
          status: 'done',
          completedAt: new Date().toISOString(),
          completedBy: driverName || 'Склад / Отгрузка'
        },
        ready: {
          status: 'done',
          completedAt: new Date().toISOString(),
          completedBy: driverName || 'Склад / Отгрузка'
        }
      }
    };

    onUpdateOrder(updatedOrder);
    speakText('Заказ успешно отгружен');
    onPrintAct(updatedOrder);
    onClose();
  };

  // Driver list from employees (only employees with driver role/position)
  const driverEmployees = employees.filter(e => 
    e.role === 'driver' || 
    e.productionRole?.toLowerCase().includes('водитель') || 
    (e as any).position?.toLowerCase().includes('водитель')
  );

  const totalPkgsCount = pkgs.length;
  const scannedCount = scannedCodes.length;
  const isAllScanned = totalPkgsCount > 0 && scannedCount === totalPkgsCount;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 flex items-center justify-center text-white font-bold shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-black text-emerald-400">#{order.orderNumber}</span>
                <span className="text-xs font-bold text-slate-400">• Отгрузка клиенту</span>
              </div>
              <h3 className="text-lg font-black text-white">{order.clientName}</h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* SECTION 1: BARCODE SCANNER & PACKAGE CHECKLIST */}
          <div className="bg-slate-50 rounded-3xl p-5 border border-slate-200/80 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-blue-600" />
                  Сканирование упаковок и коробок ({scannedCount} из {totalPkgsCount})
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Отсканируйте сканером штрихкод каждой коробки перед погрузкой в автомобиль
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowCameraScanner(true)}
                  className="px-3.5 py-2 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                  title="Сканировать камерой"
                >
                  <Camera className="w-4 h-4" />
                  <span>Сканировать</span>
                </button>

                <button
                  onClick={handleScanAllManually}
                  className="px-3.5 py-2 rounded-2xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs transition-all cursor-pointer"
                >
                  Отметить все
                </button>
              </div>
            </div>

            {/* USB Barcode Input */}
            <form onSubmit={handleScanSubmit} className="flex items-center gap-2">
              <input
                ref={scannerInputRef}
                type="text"
                placeholder="Считайте сканером штрихкод упаковки..."
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                autoFocus
                className="flex-1 px-4 py-2.5 rounded-2xl bg-white border border-slate-300 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="px-4 py-2.5 rounded-2xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Принять
              </button>
            </form>

            {scanMessage && (
              <div className={`p-3 rounded-2xl text-xs font-bold flex items-center gap-2 ${
                scanMessage.type === 'success' ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-rose-100 text-rose-900 border border-rose-300'
              }`}>
                {scanMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                <span>{scanMessage.text}</span>
              </div>
            )}

            {/* Packages Checklist List */}
            {pkgs.length === 0 ? (
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-xs font-medium">
                ⚠️ У этого заказа нет сформированных упаковок в системе. Вы можете сразу назначить водителя и распечатать Акт приема-передачи.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {pkgs.map((pkg) => {
                  const isScanned = scannedCodes.includes(pkg.code) || pkg.isShipped;

                  return (
                    <div
                      key={pkg.id}
                      onClick={() => handleScanPackageCode(pkg.code)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isScanned
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-950 shadow-xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-xs font-mono">Место #{pkg.packageNumber}</span>
                          <span className="text-[10px] text-slate-400 font-mono">({pkg.code})</span>
                        </div>
                        <div className="text-xs font-bold truncate mt-0.5">{pkg.name}</div>
                        <div className="text-[10px] text-slate-500 font-medium">
                          Деталей/фурнитуры: {pkg.parts?.length || pkg.hardwareItems?.length || 0} шт.
                        </div>
                      </div>

                      <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 font-bold ${
                        isScanned ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'
                      }`}>
                        {isScanned ? <Check className="w-4 h-4" /> : <Box className="w-4 h-4" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* SECTION 2: LOGISTICS & DRIVER FORM */}
          <div className="space-y-4">
            <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <Truck className="w-4 h-4 text-emerald-600" />
              Данные водителя и логистики
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Select or enter Driver */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Водитель / Экспедитор *</label>
                <div className="space-y-2">
                  {driverEmployees.length > 0 && (
                    <select
                      value={driverName}
                      onChange={(e) => {
                        const selEmp = employees.find(emp => emp.name === e.target.value);
                        setDriverName(e.target.value);
                        if (selEmp?.carPlate) setCarPlate(selEmp.carPlate);
                        if (selEmp?.phone) setDriverPhone(selEmp.phone);
                      }}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">-- Выберите из сотрудников / аутсорса --</option>
                      {driverEmployees.map(emp => (
                        <option key={emp.id} value={emp.name}>
                          {emp.name} ({emp.employmentType === 'outsource' ? 'Аутсорс' : 'Штат'})
                        </option>
                      ))}
                    </select>
                  )}

                  <input
                    type="text"
                    placeholder="Или введите ФИО водителя вручную..."
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Car Plate & Model */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Марка и Госномер ТС</label>
                <input
                  type="text"
                  placeholder="Например: ГАЗель А123АА 777"
                  value={carPlate}
                  onChange={(e) => setCarPlate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
              </div>

              {/* Address */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Адрес доставки клиенту</label>
                <input
                  type="text"
                  placeholder="город, улица, дом, квартира, подъезд, этаж..."
                  value={clientAddress}
                  onChange={(e) => setClientAddress(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
              </div>

              {/* Phone & Price */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Телефон клиента</label>
                <input
                  type="text"
                  placeholder="+7 (999) 000-00-00"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Стоимость доставки (₽)</label>
                <input
                  type="number"
                  value={deliveryPrice || ''}
                  onChange={(e) => setDeliveryPrice(Number(e.target.value))}
                  placeholder="0"
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            onClick={() => onPrintAct(order)}
            className="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>Печать Акта приема-передачи (А4)</span>
          </button>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-2xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs transition-colors cursor-pointer"
            >
              Отмена
            </button>

            <button
              onClick={handleConfirmShipment}
              className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Подтвердить и отгрузить заказ</span>
            </button>
          </div>
        </div>

      </div>

      {/* Camera Barcode Scanner Modal */}
      <MobileCameraScannerModal
        isOpen={showCameraScanner}
        onClose={() => setShowCameraScanner(false)}
        onScan={(code) => {
          handleScanPackageCode(code);
          setShowCameraScanner(false);
        }}
      />
    </div>
  );
};

// ----------------------------------------------------------------------
// PRINTABLE DOCUMENT MODAL (Act of Acceptance A4 format)
// ----------------------------------------------------------------------

interface PrintableShippingDocumentModalProps {
  order: ProductionOrder;
  docType: 'act' | 'ttn' | 'sticker';
  companyName: string;
  onClose: () => void;
}

const PrintableShippingDocumentModal: React.FC<PrintableShippingDocumentModalProps> = ({
  order,
  companyName,
  onClose
}) => {
  const pkgs = order.packages || [];
  const todayFormatted = new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto">
        
        {/* Top bar controls */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between no-print">
          <div className="flex items-center gap-2 text-xs font-bold">
            <Printer className="w-4 h-4 text-emerald-400" />
            <span>Печать документа — Акт приема-передачи заказа #{order.orderNumber}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors cursor-pointer"
            >
              Печать (Ctrl+P)
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Document Sheet (A4 Preview) */}
        <div className="p-8 overflow-y-auto font-sans text-slate-900 space-y-6 print:p-0 print:space-y-4">
          
          {/* Header Block */}
          <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-start">
            <div>
              <div className="text-xl font-black uppercase tracking-tight">{companyName}</div>
              <div className="text-xs text-slate-600 font-medium mt-0.5">Мебельное производство и цех готовой продукции</div>
            </div>

            <div className="text-right">
              <div className="text-xs font-mono font-bold text-slate-500">АКТ № {order.orderNumber}-ОТГ</div>
              <div className="text-xs font-bold text-slate-800 mt-0.5">{todayFormatted} года</div>
            </div>
          </div>

          {/* Title */}
          <div className="text-center space-y-1">
            <h2 className="text-lg font-black uppercase tracking-wide">
              АКТ ПРИЕМА-ПЕРЕДАЧИ ГОТОВОЙ МЕБЕЛЬНОЙ ПРОДУКЦИИ
            </h2>
            <p className="text-xs text-slate-600 font-medium">к Договору / Заказу № <span className="font-bold text-slate-900">{order.orderNumber}</span></p>
          </div>

          {/* Customer & Logistics Table */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-xs space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <span className="font-bold text-slate-500">Заказчик (Получатель):</span>
              <span className="col-span-2 font-black text-slate-900">{order.clientName}</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <span className="font-bold text-slate-500">Адрес доставки:</span>
              <span className="col-span-2 font-medium text-slate-900">{order.deliveryData?.address || 'Самовывоз со склада производства'}</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <span className="font-bold text-slate-500">Телефон заказчика:</span>
              <span className="col-span-2 font-mono font-bold text-slate-900">{order.deliveryData?.clientPhone || order.clientName}</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <span className="font-bold text-slate-500">Перевозчик / Водитель:</span>
              <span className="col-span-2 font-bold text-slate-900">{order.driverInfo?.driverName || 'Доставка предприятия'} {order.driverInfo?.carPlate ? `(${order.driverInfo.carPlate})` : ''}</span>
            </div>
          </div>

          {/* Table of Shipped Packages / Places */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              1. Перечень передаваемых упаковочных мест и комплектов:
            </h4>

            <table className="w-full text-xs border-collapse border border-slate-300">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-bold">
                  <th className="border border-slate-300 p-2 text-center w-12">№</th>
                  <th className="border border-slate-300 p-2 text-left">Наименование упаковки / Комплекта</th>
                  <th className="border border-slate-300 p-2 text-center w-32">Штрихкод</th>
                  <th className="border border-slate-300 p-2 text-center w-24">Состояние</th>
                </tr>
              </thead>
              <tbody>
                {pkgs.length > 0 ? (
                  pkgs.map((pkg, idx) => (
                    <tr key={pkg.id} className="border-b border-slate-200">
                      <td className="border border-slate-300 p-2 text-center font-bold font-mono">{idx + 1}</td>
                      <td className="border border-slate-300 p-2 font-medium">{pkg.name}</td>
                      <td className="border border-slate-300 p-2 text-center font-mono font-bold">{pkg.code}</td>
                      <td className="border border-slate-300 p-2 text-center font-bold text-emerald-700">Осмотр пройден</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="border border-slate-300 p-3 text-center text-slate-500">
                      Заказ передается единым комплектом готовой мебели по спецификации ({order.partsCount || 0} деталей).
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Legal Conditions Note */}
          <div className="text-[11px] text-slate-600 leading-relaxed space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <p>• Настоящим Акт фиксирует передачу готовой мебельной продукции от Производителя Заказчику в полном объеме и надлежащем качестве.</p>
            <p>• Упаковочные места осмотрены Заказчиком при получении, видимых механических повреждений и дефектов не обнаружено.</p>
          </div>

          {/* Signature Lines */}
          <div className="pt-8 grid grid-cols-2 gap-8 text-xs">
            <div>
              <div className="font-bold text-slate-900 mb-6">Сдал (Перевозчик / Цех):</div>
              <div className="border-b border-slate-800 pb-1 flex justify-between text-[11px] text-slate-500">
                <span>Подпись</span>
                <span>/ {order.driverInfo?.driverName || 'Отгрузчик цеха'} /</span>
              </div>
            </div>

            <div>
              <div className="font-bold text-slate-900 mb-6">Принял (Заказчик / Клиент):</div>
              <div className="border-b border-slate-800 pb-1 flex justify-between text-[11px] text-slate-500">
                <span>Подпись</span>
                <span>/ {order.clientName} /</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

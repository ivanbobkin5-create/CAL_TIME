import React, { useState, useEffect, useMemo } from 'react';
import { 
  Package, 
  CheckCircle2, 
  Circle, 
  Search, 
  Phone, 
  Building2, 
  Calendar, 
  User, 
  Layers, 
  ArrowRight, 
  Check, 
  RefreshCw, 
  Share2, 
  Printer, 
  HelpCircle, 
  AlertCircle,
  Clock,
  Sparkles,
  ChevronRight,
  ChevronDown,
  Box,
  Truck,
  Wrench,
  Compass,
  FileText
} from 'lucide-react';

interface PublicPackageViewProps {
  packageCode: string;
}

interface PackagePart {
  detailId: string;
  labelNumber: string;
  name: string;
  material?: string;
  length?: number;
  width?: number;
  thickness?: number;
  quantity?: number;
  edgeL1?: string;
  edgeL2?: string;
  edgeW1?: string;
  edgeW2?: string;
  notes?: string;
}

interface PackageData {
  id: string;
  packageNumber: number;
  name: string;
  type: 'details' | 'kitting' | 'custom';
  code: string;
  customItemsNote?: string;
  createdAt: string;
  createdByEmployeeName?: string;
  isShipped?: boolean;
  parts: PackagePart[];
}

interface OrderData {
  id: string;
  orderNumber: string;
  clientName: string;
  projectName: string;
  salonName?: string;
  deadlineDate?: string;
  totalPackagesCount: number;
  status: string;
  currentStage: string;
}

interface CompanyData {
  id?: string;
  name: string;
  phone?: string;
  address?: string;
  logoUrl?: string;
}

interface AllPackageSummary {
  id: string;
  packageNumber: number;
  name: string;
  type: 'details' | 'kitting' | 'custom';
  code: string;
  isCurrent: boolean;
  partsCount: number;
  customItemsNote?: string;
  isShipped?: boolean;
  parts: PackagePart[];
}

export const PublicPackageView: React.FC<PublicPackageViewProps> = ({ packageCode }) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [company, setCompany] = useState<CompanyData | null>(null);
  const [order, setOrder] = useState<OrderData | null>(null);
  const [pkg, setPkg] = useState<PackageData | null>(null);
  const [allPackages, setAllPackages] = useState<AllPackageSummary[]>([]);

  // Selected package tab (defaults to current scanned package id)
  const [selectedPkgId, setSelectedPkgId] = useState<string>('');

  // Search filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [globalSearchQuery, setGlobalSearchQuery] = useState<string>('');
  const [showAllPackagesModal, setShowAllPackagesModal] = useState<boolean>(false);

  // Local unpacking checklist state: Set of checked detail IDs or item indices
  const [checkedItemKeys, setCheckedItemKeys] = useState<Record<string, boolean>>({});

  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Fetch package details from public API
  const loadPackageData = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const cleanCode = encodeURIComponent(packageCode.trim());
      const res = await fetch(`/api/public/package/${cleanCode}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'Упаковка с данным QR-кодом не найдена в базе производства');
        setIsLoading(false);
        return;
      }

      setCompany(data.company || { name: 'Мебельное производство' });
      setOrder(data.order);
      setPkg(data.package);
      setSelectedPkgId(data.package.id);
      setAllPackages(data.allPackages || []);

      // Load saved checklist progress from localStorage
      try {
        const storageKey = `meb_installer_checks_${data.package.id}`;
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          setCheckedItemKeys(JSON.parse(saved));
        }
      } catch (e) {}

    } catch (err: any) {
      console.error('Failed to load package:', err);
      setErrorMsg('Не удалось связаться с сервером. Проверьте интернет-соединение.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (packageCode) {
      loadPackageData();
    }
  }, [packageCode]);

  // Active viewing package (either current scanned or selected from other packages)
  const activePackage = useMemo(() => {
    if (!pkg) return null;
    if (selectedPkgId === pkg.id) return pkg;
    const found = allPackages.find(p => p.id === selectedPkgId);
    if (found) {
      return {
        id: found.id,
        packageNumber: found.packageNumber,
        name: found.name,
        type: found.type,
        code: found.code,
        customItemsNote: found.customItemsNote,
        createdAt: pkg.createdAt,
        createdByEmployeeName: pkg.createdByEmployeeName,
        isShipped: found.isShipped,
        parts: found.parts || []
      } as PackageData;
    }
    return pkg;
  }, [pkg, allPackages, selectedPkgId]);

  // Toggle item checked in local checklist
  const toggleItemChecked = (itemKey: string) => {
    if (!activePackage) return;
    setCheckedItemKeys(prev => {
      const next = { ...prev, [itemKey]: !prev[itemKey] };
      try {
        localStorage.setItem(`meb_installer_checks_${activePackage.id}`, JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  const markAllItems = (checked: boolean) => {
    if (!activePackage) return;
    const next: Record<string, boolean> = {};
    if (checked) {
      activePackage.parts.forEach((p, idx) => {
        const key = p.detailId || `part_${idx}`;
        next[key] = true;
      });
      if (activePackage.type === 'kitting' && activePackage.customItemsNote) {
        activePackage.customItemsNote.split('\n').forEach((_, idx) => {
          next[`kit_${idx}`] = true;
        });
      }
    }
    setCheckedItemKeys(next);
    try {
      localStorage.setItem(`meb_installer_checks_${activePackage.id}`, JSON.stringify(next));
    } catch (e) {}
  };

  // Filtered parts in current package
  const filteredParts = useMemo(() => {
    if (!activePackage || !activePackage.parts) return [];
    if (!searchQuery.trim()) return activePackage.parts;
    const q = searchQuery.toLowerCase().trim();
    return activePackage.parts.filter(p => 
      p.name.toLowerCase().includes(q) ||
      p.labelNumber.toLowerCase().includes(q) ||
      (p.material && p.material.toLowerCase().includes(q)) ||
      (p.length && String(p.length).includes(q)) ||
      (p.width && String(p.width).includes(q))
    );
  }, [activePackage, searchQuery]);

  // Progress stats for current package
  const { totalItemsCount, checkedItemsCount, progressPercent } = useMemo(() => {
    if (!activePackage) return { totalItemsCount: 0, checkedItemsCount: 0, progressPercent: 0 };
    
    let total = activePackage.parts.length;
    let checked = 0;

    if (activePackage.type === 'kitting' && activePackage.customItemsNote) {
      const lines = activePackage.customItemsNote.split('\n').filter(l => l.trim().length > 0);
      total = Math.max(total, lines.length);
      lines.forEach((_, idx) => {
        if (checkedItemKeys[`kit_${idx}`]) checked++;
      });
    } else {
      activePackage.parts.forEach((p, idx) => {
        const key = p.detailId || `part_${idx}`;
        if (checkedItemKeys[key]) checked++;
      });
    }

    const pct = total > 0 ? Math.round((checked / total) * 100) : 0;
    return { totalItemsCount: total, checkedItemsCount: checked, progressPercent: pct };
  }, [activePackage, checkedItemKeys]);

  // Global search across all packages in order
  const globalSearchResults = useMemo(() => {
    if (!globalSearchQuery.trim() || !allPackages.length) return [];
    const q = globalSearchQuery.toLowerCase().trim();
    const results: Array<{
      packageNumber: number;
      packageName: string;
      packageId: string;
      type: string;
      matchedItem: string;
      dimensions?: string;
      labelNumber?: string;
    }> = [];

    allPackages.forEach(p => {
      // Check parts
      (p.parts || []).forEach(part => {
        const matchName = part.name.toLowerCase().includes(q);
        const matchLabel = part.labelNumber.toLowerCase().includes(q);
        const matchMat = part.material && part.material.toLowerCase().includes(q);
        const matchDim = (part.length && String(part.length).includes(q)) || (part.width && String(part.width).includes(q));

        if (matchName || matchLabel || matchMat || matchDim) {
          results.push({
            packageNumber: p.packageNumber,
            packageName: p.name,
            packageId: p.id,
            type: p.type,
            matchedItem: part.name,
            dimensions: part.length && part.width ? `${part.length}×${part.width}×${part.thickness || 16} мм` : undefined,
            labelNumber: part.labelNumber
          });
        }
      });

      // Check kitting notes
      if (p.customItemsNote && p.customItemsNote.toLowerCase().includes(q)) {
        results.push({
          packageNumber: p.packageNumber,
          packageName: p.name,
          packageId: p.id,
          type: 'kitting',
          matchedItem: p.customItemsNote
        });
      }
    });

    return results;
  }, [globalSearchQuery, allPackages]);

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Паспорт упаковки №${activePackage?.packageNumber} - Заказ ${order?.orderNumber}`,
          text: `Состав упаковки "${activePackage?.name}" заказа №${order?.orderNumber} (${order?.clientName || ''})`,
          url: url
        });
        return;
      } catch (e) {}
    }
    // Fallback copy to clipboard
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (e) {}
  };

  // Loading State
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200/80 flex flex-col items-center max-w-sm w-full text-center">
          <div className="relative mb-5">
            <div className="w-16 h-16 rounded-2xl bg-blue-600/10 flex items-center justify-center text-blue-600 animate-pulse">
              <Package className="w-8 h-8 animate-bounce" />
            </div>
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white" />
          </div>
          <h2 className="text-lg font-black text-slate-900 mb-1">Загрузка паспорта упаковки</h2>
          <p className="text-xs text-slate-500 font-medium">Получение состава деталей и комплектации заказа...</p>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-6 overflow-hidden">
            <div className="bg-blue-600 h-full rounded-full animate-pulse w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  // Error State
  if (errorMsg || !pkg || !order) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-rose-100 flex flex-col items-center max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 mb-4">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-slate-900 mb-2">Упаковка не найдена</h2>
          <p className="text-sm text-slate-600 mb-6 leading-relaxed">
            {errorMsg || 'QR-код содержит недействительный или устаревший идентификатор упаковки.'}
          </p>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 w-full text-left mb-6 text-xs text-slate-600 space-y-1.5">
            <div className="font-bold text-slate-700">Код сканирования:</div>
            <div className="font-mono bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-800 break-all select-all font-semibold">
              {packageCode}
            </div>
            <div className="text-[11px] text-slate-600 pt-1">
              Убедитесь, что заказ был упакован в системе ERP и этикетка сформирована корректно.
            </div>
          </div>

          <div className="flex flex-col w-full gap-2">
            <button
              onClick={loadPackageData}
              className="w-full py-3 px-4 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-[0.98]"
            >
              <RefreshCw className="w-4 h-4" />
              Попробовать снова
            </button>
            {company?.phone && (
              <a
                href={`tel:${company.phone}`}
                className="w-full py-3 px-4 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                <Phone className="w-4 h-4 text-emerald-600" />
                Связаться с производством
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  const formattedDate = activePackage?.createdAt
    ? new Date(activePackage.createdAt).toLocaleString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : '';

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans pb-16">
      {/* Top Mobile-Friendly Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-black text-sm shadow-md shadow-blue-500/20 shrink-0">
              <Box className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-black uppercase tracking-wider text-blue-600">
                Цифровой паспорт упаковки
              </div>
              <div className="text-sm font-black text-slate-900 truncate">
                {company?.name || 'Мебельное производство'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {company?.phone && (
              <a
                href={`tel:${company.phone}`}
                title="Позвонить на производство"
                className="p-2 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all flex items-center gap-1.5 text-xs font-bold"
              >
                <Phone className="w-4 h-4 text-emerald-600" />
                <span className="hidden sm:inline">Цех</span>
              </a>
            )}

            <button
              onClick={handleShare}
              title="Поделиться паспортом"
              className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all relative flex items-center gap-1 text-xs font-bold"
            >
              {copiedLink ? (
                <span className="text-emerald-600 font-bold flex items-center gap-1 text-xs">
                  <Check className="w-4 h-4" /> Скопировано
                </span>
              ) : (
                <Share2 className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-3xl mx-auto px-4 pt-4 space-y-4">
        
        {/* Order Information Banner Card */}
        <section className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200/60 text-blue-700 text-xs font-black">
                ЗАКАЗ № {order.orderNumber}
              </span>
              {order.status === 'shipped' || activePackage?.isShipped ? (
                <span className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold flex items-center gap-1">
                  <Truck className="w-3 h-3" /> Отгружено
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-bold">
                  Готово к монтажу
                </span>
              )}
            </div>

            <div className="text-xs font-bold text-slate-600">
              Всего мест: <strong className="text-slate-800 font-black">{order.totalPackagesCount}</strong>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-slate-600 block">Заказчик / Проект:</span>
              <strong className="text-slate-900 font-bold text-sm block truncate">
                {order.clientName || 'Частный заказчик'}
                {order.projectName ? ` • ${order.projectName}` : ''}
              </strong>
            </div>
            {order.salonName && (
              <div>
                <span className="text-slate-600 block">Салон / Дилер:</span>
                <strong className="text-slate-900 font-bold block truncate">{order.salonName}</strong>
              </div>
            )}
          </div>
        </section>

        {/* Hero Card: Current Package Being Inspected */}
        <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
          {/* Subtle Tech Glow Overlay */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 font-black text-xs">
                <Box className="w-3.5 h-3.5" />
                МЕСТО {activePackage?.packageNumber} ИЗ {order.totalPackagesCount}
              </div>

              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-md ${
                activePackage?.type === 'kitting' 
                  ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30' 
                  : 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/30'
              }`}>
                {activePackage?.type === 'kitting' ? '🔩 Комплектация / Фурнитура' : '📦 Детали ЛДСП / МДФ'}
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mb-2">
              {activePackage?.name || `Место №${activePackage?.packageNumber}`}
            </h1>

            <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-300 pt-1 border-t border-white/10">
              {activePackage?.createdByEmployeeName && (
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-blue-400" />
                  <span>Упаковал: <strong className="text-white">{activePackage.createdByEmployeeName}</strong></span>
                </div>
              )}
              {formattedDate && (
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>{formattedDate}</span>
                </div>
              )}
            </div>

            {/* Checklist Progress Bar */}
            {totalItemsCount > 0 && (
              <div className="mt-4 pt-3 border-t border-white/10">
                <div className="flex items-center justify-between text-xs mb-1.5 font-bold">
                  <span className="text-slate-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Распаковка и проверка на объекте:
                  </span>
                  <span className="text-emerald-300 font-mono">
                    {checkedItemsCount} из {totalItemsCount} ({progressPercent}%)
                  </span>
                </div>
                <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden p-0.5 border border-white/10">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Global Multi-Package Search / Navigator Toggle */}
        {allPackages.length > 1 && (
          <section className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <span className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-blue-600" />
                Навигатор по коробкам заказа ({allPackages.length} мест)
              </span>
              <button
                onClick={() => setShowAllPackagesModal(!showAllPackagesModal)}
                className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-0.5"
              >
                {showAllPackagesModal ? 'Свернуть список' : 'Показать все места'}
                {showAllPackagesModal ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Horizontal Quick Package Selector Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-0.5 no-scrollbar">
              {allPackages.map(p => {
                const isSelected = p.id === activePackage?.id;
                const isScanned = p.id === pkg.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedPkgId(p.id);
                      setSearchQuery('');
                    }}
                    className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shrink-0 transition-all ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 ring-2 ring-blue-600 ring-offset-1'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/60'
                    }`}
                  >
                    <span>Место {p.packageNumber}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {p.type === 'kitting' ? 'Фурнитура' : `${p.partsCount} дет.`}
                    </span>
                    {isScanned && (
                      <span className="w-2 h-2 rounded-full bg-emerald-400" title="Текущая отсканированная коробка" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Global Part Finder Input */}
            <div className="mt-3 pt-3 border-t border-slate-100">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Ищете деталь? Введите название или размер (ищет по ВСЕМ коробкам)..."
                  value={globalSearchQuery}
                  onChange={(e) => setGlobalSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-800 placeholder:text-slate-400"
                />
                {globalSearchQuery && (
                  <button 
                    onClick={() => setGlobalSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Global search result drawer */}
              {globalSearchQuery.trim() && (
                <div className="mt-2 p-3 bg-blue-50/70 border border-blue-100 rounded-xl space-y-2">
                  <div className="text-[11px] font-bold text-blue-900">
                    Результаты поиска во всех коробках ({globalSearchResults.length}):
                  </div>
                  {globalSearchResults.length === 0 ? (
                    <div className="text-xs text-slate-500 py-1 italic">
                      Ничего не найдено по запросу "{globalSearchQuery}"
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {globalSearchResults.map((res, i) => (
                        <div 
                          key={i}
                          onClick={() => {
                            setSelectedPkgId(res.packageId);
                            setGlobalSearchQuery('');
                          }}
                          className="p-2 bg-white rounded-lg border border-blue-200/60 hover:border-blue-500 cursor-pointer flex items-center justify-between gap-2 text-xs transition-all shadow-xs"
                        >
                          <div className="min-w-0">
                            <span className="font-bold text-slate-900 block truncate">
                              {res.labelNumber ? `#${res.labelNumber} ` : ''}{res.matchedItem}
                            </span>
                            {res.dimensions && (
                              <span className="text-[11px] font-mono text-slate-500">{res.dimensions}</span>
                            )}
                          </div>
                          <span className="px-2 py-1 bg-blue-600 text-white font-bold text-[10px] rounded-md shrink-0">
                            В Месте №{res.packageNumber} ➜
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Main Content Area: Parts / Hardware List of Active Package */}
        <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          {/* Header of Content */}
          <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-600" />
                {activePackage?.type === 'kitting' ? 'Состав фурнитуры и крепежа' : 'Вложенные детали в это место'}
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                {activePackage?.type === 'kitting' 
                  ? 'Комплектация фурнитуры, направляющих, петель и крепежа'
                  : `Перечень панелей и деталей с размерами и кромкой (${filteredParts.length} шт.)`}
              </p>
            </div>

            {/* Quick check/uncheck all buttons */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => markAllItems(true)}
                className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold transition-all active:scale-95 flex items-center gap-1"
                title="Отметить все позиции"
              >
                <Check className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Отметить все</span>
              </button>
              <button
                onClick={() => markAllItems(false)}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold transition-all active:scale-95"
                title="Снять отметки"
              >
                Сброс
              </button>
            </div>
          </div>

          {/* Local Filter within package */}
          {activePackage?.type !== 'kitting' && activePackage && activePackage.parts.length > 5 && (
            <div className="px-4 py-2.5 bg-slate-50/70 border-b border-slate-100">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Фильтр по номеру бирки, названию или размеру в этой коробке..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-800 placeholder:text-slate-400"
                />
              </div>
            </div>
          )}

          {/* Kitting Custom Note View */}
          {activePackage?.type === 'kitting' ? (
            <div className="p-4 sm:p-5">
              <div className="bg-amber-50/50 border border-amber-200/80 rounded-2xl p-4 mb-4">
                <div className="flex items-center gap-2 text-amber-800 text-xs font-black uppercase tracking-wider mb-2">
                  <Wrench className="w-4 h-4 text-amber-600" />
                  Упаковка фурнитуры / Комплектация
                </div>
                <p className="text-xs text-amber-700 leading-relaxed font-medium">
                  Ниже приведен список фурнитуры, крепежных элементов и комплектующих, уложенных в данное место.
                  Нажимайте на пункт, чтобы отметить его наличие при распаковке.
                </p>
              </div>

              {activePackage.customItemsNote ? (
                <div className="space-y-2">
                  {activePackage.customItemsNote.split('\n').filter(Boolean).map((line, idx) => {
                    const itemKey = `kit_${idx}`;
                    const isChecked = !!checkedItemKeys[itemKey];

                    return (
                      <div
                        key={idx}
                        onClick={() => toggleItemChecked(itemKey)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer select-none flex items-start gap-3 ${
                          isChecked
                            ? 'bg-emerald-50/60 border-emerald-200 text-slate-600'
                            : 'bg-white border-slate-200 hover:border-blue-400 shadow-xs text-slate-800'
                        }`}
                      >
                        <div className="pt-0.5 shrink-0">
                          {isChecked ? (
                            <div className="w-5 h-5 rounded-md bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-md border-2 border-slate-300 bg-white" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <span className={`text-sm font-bold block ${isChecked ? 'line-through text-slate-600' : 'text-slate-900'}`}>
                            {line}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-600 italic text-sm">
                  Список фурнитуры не заполнен. Место сформировано как общее место комплектации.
                </div>
              )}
            </div>
          ) : (
            /* Details / Panels List */
            <div className="divide-y divide-slate-100">
              {filteredParts.length === 0 ? (
                <div className="p-8 text-center text-slate-600 text-sm">
                  {searchQuery ? `Детали с параметром "${searchQuery}" не найдены в этой коробке.` : 'В этой упаковке нет вложенных деталей.'}
                </div>
              ) : (
                filteredParts.map((part, idx) => {
                  const itemKey = part.detailId || `part_${idx}`;
                  const isChecked = !!checkedItemKeys[itemKey];

                  // Form edge banding summary
                  const edges = [
                    part.edgeL1 && `L1: ${part.edgeL1}`,
                    part.edgeL2 && `L2: ${part.edgeL2}`,
                    part.edgeW1 && `W1: ${part.edgeW1}`,
                    part.edgeW2 && `W2: ${part.edgeW2}`,
                  ].filter(Boolean);

                  return (
                    <div
                      key={itemKey}
                      onClick={() => toggleItemChecked(itemKey)}
                      className={`p-3.5 sm:p-4 transition-all cursor-pointer select-none flex items-start gap-3.5 ${
                        isChecked
                          ? 'bg-emerald-50/40 opacity-75'
                          : 'hover:bg-slate-50/80 bg-white'
                      }`}
                    >
                      {/* Interactive Checkbox */}
                      <div className="pt-1 shrink-0">
                        {isChecked ? (
                          <div className="w-5 h-5 rounded-md bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-md border-2 border-slate-300 bg-white hover:border-blue-500" />
                        )}
                      </div>

                      {/* Part Information */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="px-2 py-0.5 rounded bg-slate-900 text-white font-mono font-black text-xs shrink-0">
                              #{part.labelNumber || idx + 1}
                            </span>
                            <h3 className={`text-sm font-bold truncate ${
                              isChecked ? 'line-through text-slate-600' : 'text-slate-900'
                            }`}>
                              {part.name}
                            </h3>
                          </div>

                          {/* Dimensions High-Contrast Pill */}
                          {part.length && part.width && (
                            <span className="px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200/80 text-blue-900 font-mono font-black text-xs tracking-tight shrink-0 shadow-2xs">
                              {part.length} × {part.width} {part.thickness ? `× ${part.thickness}` : ''} мм
                            </span>
                          )}
                        </div>

                        {/* Material & Edge info tags */}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1.5">
                          {part.material && (
                            <span className="font-semibold text-slate-700">
                              {part.material}
                            </span>
                          )}

                          {part.quantity && part.quantity > 1 && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 font-black text-[11px]">
                              Количество: {part.quantity} шт
                            </span>
                          )}

                          {edges.length > 0 && (
                            <span className="text-[11px] text-slate-600 font-mono">
                              Кромка: {edges.join(' | ')}
                            </span>
                          )}

                          {part.notes && (
                            <span className="text-[11px] text-indigo-600 font-medium italic">
                              Примечание: {part.notes}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </section>

        {/* Footer info & Tech Support */}
        <footer className="text-center py-6 text-xs text-slate-600 space-y-2">
          <div>
            Данный цифровой паспорт сгенерирован системой управления мебельным производством.
          </div>
          {company?.phone && (
            <div>
              Возникли вопросы по комплектации? Телефон производства:{' '}
              <a href={`tel:${company.phone}`} className="text-blue-600 font-bold hover:underline">
                {company.phone}
              </a>
            </div>
          )}
        </footer>

      </main>
    </div>
  );
};

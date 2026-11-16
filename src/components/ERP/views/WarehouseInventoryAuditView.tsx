import React, { useState, useMemo, useEffect } from 'react';
import { 
  ClipboardCheck, 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  User, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Save, 
  ArrowLeft, 
  Printer, 
  Trash2, 
  RefreshCw, 
  Check, 
  X, 
  Boxes, 
  ChevronRight, 
  Layers, 
  TrendingUp, 
  TrendingDown, 
  HelpCircle,
  Building2,
  FileSpreadsheet
} from 'lucide-react';
import { WarehouseItem, WarehouseMovement } from './WarehouseView';
import { cn } from '../../../lib/utils';

export interface InventoryAuditItem {
  itemId: string;
  sku: string;
  name: string;
  category: string;
  brand?: string;
  storageCell?: string;
  unit: string;
  price: number;
  bookQty: number;              // Учетный остаток на момент фиксации (старта)
  movementsDuringAudit: number; // +приходы / -расходы за время проведения ревизии
  adjustedBookQty: number;      // Расчетный учет с учетом движений (bookQty + movementsDuringAudit)
  actualQty: number;            // Фактическое количество по пересчету
  isCounted: boolean;           // Отмечено как пересчитанное
  discrepancy: number;          // actualQty - adjustedBookQty
  discrepancySum: number;       // discrepancy * price
  discrepancyReason?: string;   // Причина расхождения (бой, пересорт, брак и т.д.)
}

export interface WarehouseInventoryDocument {
  id: string;
  docNumber: string;            // Номер документа, например "ИНВ-001"
  createdAt: string;            // Дата и время создания
  updatedAt: string;            // Дата последнего сохранения
  completedAt?: string;         // Дата проведения
  snapshotDate: string;         // Дата фиксации остатков
  status: 'draft' | 'in_progress' | 'completed' | 'cancelled';
  targetGroups: string[];       // ['ЛДСП', 'МДФ', 'Кромка', 'Фурнитура' ...]
  selectedBrands?: string[];    // Выбранные бренды
  responsibleName: string;      // Ответственное лицо
  responsibleId?: string;
  commissionMembers?: string[]; // Члены комиссии
  description?: string;         // Основание / примечание
  items: InventoryAuditItem[];
  totalBookValuation: number;
  totalFactValuation: number;
  surplusValuation: number;     // Сумма излишков (+)
  shortageValuation: number;    // Сумма недостач (-)
  totalDiscrepancyCount: number;
}

interface WarehouseInventoryAuditViewProps {
  companyId: string;
  companyName?: string;
  warehouseItems: WarehouseItem[];
  movements: WarehouseMovement[];
  currentUser?: any;
  activeBrands?: string[];
  onApplyInventory: (adjustedItems: WarehouseItem[], movementsToAdd: WarehouseMovement[]) => Promise<void>;
}

export const WarehouseInventoryAuditView: React.FC<WarehouseInventoryAuditViewProps> = ({
  companyId,
  companyName,
  warehouseItems,
  movements,
  currentUser,
  activeBrands = [],
  onApplyInventory
}) => {
  // Screen state: list | editor | print
  const [viewMode, setViewMode] = useState<'list' | 'editor' | 'print'>('list');
  const [inventories, setInventories] = useState<WarehouseInventoryDocument[]>([]);
  const [currentDoc, setCurrentDoc] = useState<WarehouseInventoryDocument | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // New inventory modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newDocGroups, setNewDocGroups] = useState<string[]>([
    'ЛДСП', 'МДФ', 'Кромка', 'Фурнитура', 'Столешницы', 'Метизы и крепеж'
  ]);
  const [newDocResponsible, setNewDocResponsible] = useState(currentUser?.name || 'Кладовщик');
  const [newDocCommission, setNewDocCommission] = useState('Мастер цеха, Начальник производства');
  const [newDocDescription, setNewDocDescription] = useState('Плановая ежемесячная инвентаризация ТМЦ');
  const [newDocFilterActiveBrandsOnly, setNewDocFilterActiveBrandsOnly] = useState(true);

  // Editor filter & search
  const [editorSearch, setEditorSearch] = useState('');
  const [editorCategoryFilter, setEditorCategoryFilter] = useState('all');
  const [editorDiscrepancyFilter, setEditorDiscrepancyFilter] = useState<'all' | 'discrepancy_only' | 'surplus' | 'shortage' | 'uncounted'>('all');
  const [showCompleteConfirmModal, setShowCompleteConfirmModal] = useState(false);

  // List view filters
  const [listStatusFilter, setListStatusFilter] = useState<'all' | 'draft' | 'completed'>('all');
  const [listSearch, setListSearch] = useState('');

  // Available groups for selection
  const ALL_WAREHOUSE_GROUPS = [
    'ЛДСП',
    'МДФ',
    'Кромка',
    'Фурнитура',
    'Столешницы',
    'Фасады',
    'Метизы и крепеж',
    'Профили и цоколи',
    'Химия и клей',
    'Деловые обрезки'
  ];

  // Fetch inventories from backend
  const fetchInventories = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/companies/${companyId}/warehouse-inventories`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.inventories)) {
          // Sort by updatedAt / createdAt descending
          const sorted = data.inventories.sort((a: any, b: any) => 
            new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
          );
          setInventories(sorted);
        }
      }
    } catch (err) {
      console.error('Error fetching warehouse inventories:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (companyId) {
      fetchInventories();
    }
  }, [companyId]);

  // Save current doc to server (draft or completed)
  const saveInventoryDoc = async (docToSave: WarehouseInventoryDocument) => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/companies/${companyId}/warehouse-inventories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(docToSave)
      });
      if (res.ok) {
        setInventories(prev => {
          const idx = prev.findIndex(d => d.id === docToSave.id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = docToSave;
            return next;
          }
          return [docToSave, ...prev];
        });
      }
    } catch (err) {
      console.error('Error saving warehouse inventory:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete draft inventory
  const handleDeleteDraft = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Вы действительно хотите удалить этот черновик инвентаризации?')) return;
    try {
      await fetch(`/api/companies/${companyId}/warehouse-inventories/${id}`, {
        method: 'DELETE'
      });
      setInventories(prev => prev.filter(d => d.id !== id));
      if (currentDoc?.id === id) {
        setCurrentDoc(null);
        setViewMode('list');
      }
    } catch (err) {
      console.error('Error deleting inventory draft:', err);
    }
  };

  // Calculate movements during audit for an item
  const calculateMovementsDuringAudit = (itemId: string, snapshotDateIso: string): number => {
    const snapTime = new Date(snapshotDateIso).getTime();
    if (!snapTime) return 0;

    let delta = 0;
    movements.forEach(m => {
      if (m.itemId === itemId) {
        const mTime = new Date(m.date).getTime();
        if (mTime >= snapTime) {
          if (m.type === 'arrival' || m.type === 'inventory_surplus') {
            delta += (m.quantity || 0);
          } else if (m.type === 'write_off' || m.type === 'order_reservation' || m.type === 'inventory_shortage') {
            delta -= (m.quantity || 0);
          }
        }
      }
    });
    return delta;
  };

  // Re-sync movements into items
  const syncMovementsIntoDoc = (doc: WarehouseInventoryDocument): WarehouseInventoryDocument => {
    if (doc.status === 'completed') return doc; // don't mutate completed docs

    const updatedItems = doc.items.map(item => {
      const movDelta = calculateMovementsDuringAudit(item.itemId, doc.snapshotDate);
      const adjustedBook = item.bookQty + movDelta;
      const discrepancy = item.actualQty - adjustedBook;
      const discrepancySum = discrepancy * (item.price || 0);

      return {
        ...item,
        movementsDuringAudit: movDelta,
        adjustedBookQty: adjustedBook,
        discrepancy,
        discrepancySum: Math.round(discrepancySum)
      };
    });

    const surplusValuation = updatedItems
      .filter(i => i.discrepancy > 0)
      .reduce((acc, i) => acc + (i.discrepancy * i.price), 0);

    const shortageValuation = updatedItems
      .filter(i => i.discrepancy < 0)
      .reduce((acc, i) => acc + Math.abs(i.discrepancy * i.price), 0);

    const totalFactValuation = updatedItems
      .reduce((acc, i) => acc + (i.actualQty * i.price), 0);

    const totalDiscrepancyCount = updatedItems.filter(i => i.discrepancy !== 0).length;

    return {
      ...doc,
      items: updatedItems,
      surplusValuation: Math.round(surplusValuation),
      shortageValuation: Math.round(shortageValuation),
      totalFactValuation: Math.round(totalFactValuation),
      totalDiscrepancyCount
    };
  };

  // Open existing document
  const handleOpenDoc = (doc: WarehouseInventoryDocument) => {
    const synced = syncMovementsIntoDoc(doc);
    setCurrentDoc(synced);
    setViewMode('editor');
  };

  // Generate next document number (ИНВ-001, ИНВ-002...)
  const getNextDocNumber = (): string => {
    const count = inventories.length + 1;
    return `ИНВ-${String(count).padStart(3, '0')}`;
  };

  // Start new inventory document creation
  const handleCreateNewInventory = () => {
    if (newDocGroups.length === 0) {
      alert('Пожалуйста, выберите хотя бы одну группу товаров для инвентаризации');
      return;
    }

    const nowIso = new Date().toISOString();
    const docNumber = getNextDocNumber();

    // Filter warehouse items by selected groups and active brands
    const matchingItems = warehouseItems.filter(item => {
      // Group filter
      const matchesGroup = newDocGroups.some(g => {
        if (g === 'Деловые обрезки') return item.isResidual;
        return (item.category || '').toLowerCase() === g.toLowerCase();
      });
      if (!matchesGroup) return false;

      // Brand filter
      if (newDocFilterActiveBrandsOnly && activeBrands.length > 0) {
        const itemBrand = item.supplier || '';
        // If it's a known brand, check if it's in activeBrands
        if (itemBrand && !activeBrands.includes(itemBrand)) {
          // If item is completely 0 and belongs to excluded brand, skip
          if (item.quantity === 0) return false;
        }
      }

      return true;
    });

    if (matchingItems.length === 0) {
      alert('По выбранным группам товаров складские позиции не найдены. Проверьте фильтр групп.');
      return;
    }

    const auditItems: InventoryAuditItem[] = matchingItems.map(item => ({
      itemId: item.id,
      sku: item.sku || '',
      name: item.name,
      category: item.category || 'ЛДСП',
      brand: item.supplier || '',
      storageCell: item.storageCell || '',
      unit: item.unit || 'шт',
      price: item.price || 0,
      bookQty: item.quantity || 0,
      movementsDuringAudit: 0,
      adjustedBookQty: item.quantity || 0,
      actualQty: item.quantity || 0, // initially seeded with bookQty for convenience
      isCounted: false,
      discrepancy: 0,
      discrepancySum: 0,
      discrepancyReason: ''
    }));

    const totalBookValuation = auditItems.reduce((acc, i) => acc + (i.bookQty * i.price), 0);

    const newDoc: WarehouseInventoryDocument = {
      id: `wh-inv-${Date.now()}`,
      docNumber,
      createdAt: nowIso,
      updatedAt: nowIso,
      snapshotDate: nowIso,
      status: 'in_progress',
      targetGroups: [...newDocGroups],
      selectedBrands: newDocFilterActiveBrandsOnly ? [...activeBrands] : undefined,
      responsibleName: newDocResponsible.trim() || 'Кладовщик',
      responsibleId: currentUser?.id,
      commissionMembers: newDocCommission ? newDocCommission.split(',').map(s => s.trim()).filter(Boolean) : [],
      description: newDocDescription.trim() || 'Инвентаризация ТМЦ',
      items: auditItems,
      totalBookValuation: Math.round(totalBookValuation),
      totalFactValuation: Math.round(totalBookValuation),
      surplusValuation: 0,
      shortageValuation: 0,
      totalDiscrepancyCount: 0
    };

    saveInventoryDoc(newDoc);
    setCurrentDoc(newDoc);
    setShowCreateModal(false);
    setViewMode('editor');
  };

  // Editor handlers
  const handleUpdateItemActualQty = (itemId: string, newActualVal: number) => {
    if (!currentDoc || currentDoc.status === 'completed') return;

    setCurrentDoc(prev => {
      if (!prev) return null;
      const nextItems = prev.items.map(item => {
        if (item.itemId !== itemId) return item;
        const actual = Math.max(0, newActualVal);
        const discrepancy = actual - item.adjustedBookQty;
        const discrepancySum = Math.round(discrepancy * item.price);
        return {
          ...item,
          actualQty: actual,
          isCounted: true,
          discrepancy,
          discrepancySum
        };
      });

      const surplusValuation = nextItems
        .filter(i => i.discrepancy > 0)
        .reduce((acc, i) => acc + (i.discrepancy * i.price), 0);

      const shortageValuation = nextItems
        .filter(i => i.discrepancy < 0)
        .reduce((acc, i) => acc + Math.abs(i.discrepancy * i.price), 0);

      const totalFactValuation = nextItems
        .reduce((acc, i) => acc + (i.actualQty * i.price), 0);

      const totalDiscrepancyCount = nextItems.filter(i => i.discrepancy !== 0).length;

      return {
        ...prev,
        items: nextItems,
        updatedAt: new Date().toISOString(),
        surplusValuation: Math.round(surplusValuation),
        shortageValuation: Math.round(shortageValuation),
        totalFactValuation: Math.round(totalFactValuation),
        totalDiscrepancyCount
      };
    });
  };

  const handleUpdateItemReason = (itemId: string, reason: string) => {
    if (!currentDoc || currentDoc.status === 'completed') return;
    setCurrentDoc(prev => {
      if (!prev) return null;
      return {
        ...prev,
        items: prev.items.map(i => i.itemId === itemId ? { ...i, discrepancyReason: reason } : i),
        updatedAt: new Date().toISOString()
      };
    });
  };

  const handleToggleCounted = (itemId: string) => {
    if (!currentDoc || currentDoc.status === 'completed') return;
    setCurrentDoc(prev => {
      if (!prev) return null;
      return {
        ...prev,
        items: prev.items.map(i => i.itemId === itemId ? { ...i, isCounted: !i.isCounted } : i),
        updatedAt: new Date().toISOString()
      };
    });
  };

  // Quick action: Fill all actual quantities with book quantities
  const handleFillAllWithBook = () => {
    if (!currentDoc || currentDoc.status === 'completed') return;
    if (!window.confirm('Установить фактическое количество равным учетному для всех не пересчитанных позиций?')) return;

    setCurrentDoc(prev => {
      if (!prev) return null;
      const nextItems = prev.items.map(item => {
        if (item.isCounted) return item;
        return {
          ...item,
          actualQty: item.adjustedBookQty,
          isCounted: true,
          discrepancy: 0,
          discrepancySum: 0
        };
      });

      const surplusValuation = nextItems
        .filter(i => i.discrepancy > 0)
        .reduce((acc, i) => acc + (i.discrepancy * i.price), 0);

      const shortageValuation = nextItems
        .filter(i => i.discrepancy < 0)
        .reduce((acc, i) => acc + Math.abs(i.discrepancy * i.price), 0);

      const totalFactValuation = nextItems
        .reduce((acc, i) => acc + (i.actualQty * i.price), 0);

      const totalDiscrepancyCount = nextItems.filter(i => i.discrepancy !== 0).length;

      return {
        ...prev,
        items: nextItems,
        updatedAt: new Date().toISOString(),
        surplusValuation: Math.round(surplusValuation),
        shortageValuation: Math.round(shortageValuation),
        totalFactValuation: Math.round(totalFactValuation),
        totalDiscrepancyCount
      };
    });
  };

  // Finalize and complete inventory audit
  const handleConfirmCompleteInventory = async () => {
    if (!currentDoc) return;

    const completedTime = new Date().toISOString();
    const finalDoc: WarehouseInventoryDocument = {
      ...currentDoc,
      status: 'completed',
      completedAt: completedTime,
      updatedAt: completedTime
    };

    // Prepare adjusted warehouse items and movements
    const adjustedWarehouseItems: WarehouseItem[] = [];
    const movementsToAdd: WarehouseMovement[] = [];

    currentDoc.items.forEach(auditItem => {
      const origItem = warehouseItems.find(w => w.id === auditItem.itemId);
      if (!origItem) return;

      // Update physical stock to actual counted qty
      const updatedItem: WarehouseItem = {
        ...origItem,
        quantity: auditItem.actualQty,
        availableQty: Math.max(0, auditItem.actualQty - (origItem.reservedQty || 0)),
        updatedAt: completedTime,
        updatedBy: currentDoc.responsibleName
      };
      adjustedWarehouseItems.push(updatedItem);

      // Generate movement if there is discrepancy
      if (auditItem.discrepancy !== 0) {
        const isSurplus = auditItem.discrepancy > 0;
        const absQty = Math.abs(auditItem.discrepancy);
        const mov: WarehouseMovement = {
          id: `mov-inv-${currentDoc.docNumber}-${auditItem.itemId}-${Date.now()}`,
          date: completedTime,
          type: isSurplus ? 'arrival' : 'write_off',
          itemId: auditItem.itemId,
          itemName: auditItem.name,
          category: auditItem.category,
          quantity: absQty,
          unit: auditItem.unit,
          toLocation: isSurplus ? (auditItem.storageCell || 'Склад') : undefined,
          fromLocation: !isSurplus ? (auditItem.storageCell || 'Склад') : undefined,
          performedBy: currentDoc.responsibleName,
          notes: isSurplus
            ? `Оприходование излишков по акту ${currentDoc.docNumber}. ${auditItem.discrepancyReason || ''}`.trim()
            : `Списание недостачи по акту ${currentDoc.docNumber}. ${auditItem.discrepancyReason || ''}`.trim()
        };
        movementsToAdd.push(mov);
      }
    });

    try {
      // 1. Save document as completed
      await saveInventoryDoc(finalDoc);

      // 2. Apply adjustments to warehouse items and movements in parent
      await onApplyInventory(adjustedWarehouseItems, movementsToAdd);

      setCurrentDoc(finalDoc);
      setShowCompleteConfirmModal(false);
      alert(`Инвентаризация ${finalDoc.docNumber} успешно проведена! Остатки на складе скорректированы, сформировано ${movementsToAdd.length} складских проводок.`);
    } catch (err: any) {
      console.error('Error completing inventory:', err);
      alert('Ошибка при проведении инвентаризации: ' + err.message);
    }
  };

  // Filtered items in editor
  const filteredEditorItems = useMemo(() => {
    if (!currentDoc) return [];

    return currentDoc.items.filter(item => {
      // Category filter
      if (editorCategoryFilter !== 'all' && item.category !== editorCategoryFilter) {
        return false;
      }

      // Discrepancy filter
      if (editorDiscrepancyFilter === 'discrepancy_only' && item.discrepancy === 0) return false;
      if (editorDiscrepancyFilter === 'surplus' && item.discrepancy <= 0) return false;
      if (editorDiscrepancyFilter === 'shortage' && item.discrepancy >= 0) return false;
      if (editorDiscrepancyFilter === 'uncounted' && item.isCounted) return false;

      // Search query
      if (editorSearch.trim()) {
        const q = editorSearch.toLowerCase();
        return (
          item.name.toLowerCase().includes(q) ||
          item.sku.toLowerCase().includes(q) ||
          (item.brand && item.brand.toLowerCase().includes(q)) ||
          (item.storageCell && item.storageCell.toLowerCase().includes(q))
        );
      }

      return true;
    });
  }, [currentDoc, editorCategoryFilter, editorDiscrepancyFilter, editorSearch]);

  // Counted items progress
  const countedCount = currentDoc ? currentDoc.items.filter(i => i.isCounted).length : 0;
  const totalItemsCount = currentDoc ? currentDoc.items.length : 0;
  const progressPercent = totalItemsCount > 0 ? Math.round((countedCount / totalItemsCount) * 100) : 0;

  // Filtered documents in list view
  const filteredDocList = useMemo(() => {
    return inventories.filter(doc => {
      if (listStatusFilter === 'draft' && doc.status === 'completed') return false;
      if (listStatusFilter === 'completed' && doc.status !== 'completed') return false;

      if (listSearch.trim()) {
        const q = listSearch.toLowerCase();
        return (
          doc.docNumber.toLowerCase().includes(q) ||
          doc.responsibleName.toLowerCase().includes(q) ||
          (doc.description && doc.description.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [inventories, listStatusFilter, listSearch]);

  return (
    <div className="space-y-4">
      {/* ========================================================
          VIEW MODE 1: LIST OF INVENTORIES (ЖУРНАЛ ИНВЕНТАРИЗАЦИЙ)
          ======================================================== */}
      {viewMode === 'list' && (
        <div className="space-y-4">
          {/* Top Bar with Metrics & Action Button */}
          <div className="bg-white rounded-2xl p-5 border border-gray-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                  <ClipboardCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 tracking-tight">
                    Инвентаризация склада ТМЦ
                  </h2>
                  <p className="text-xs text-gray-500">
                    Официальный учет, пошаговый пересчет, контроль движений и проведение сличительных ведомостей
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  fetchInventories();
                }}
                disabled={isLoading}
                className="px-3.5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                title="Обновить список"
              >
                <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
                <span>Обновить</span>
              </button>

              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-extrabold rounded-xl text-xs sm:text-sm shadow-md shadow-indigo-200 flex items-center gap-2 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Создать инвентаризацию</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-2xs">
              <div className="text-[11px] font-bold text-gray-500">Всего документов</div>
              <div className="text-base font-extrabold text-gray-900 mt-0.5">
                {inventories.length} <span className="text-xs font-normal text-gray-400">док.</span>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-amber-200/80 shadow-2xs bg-amber-50/20">
              <div className="text-[11px] font-bold text-amber-700 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> В процессе / Черновики
              </div>
              <div className="text-base font-extrabold text-amber-900 mt-0.5">
                {inventories.filter(i => i.status !== 'completed').length} <span className="text-xs font-normal text-amber-700">док.</span>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-emerald-200/80 shadow-2xs bg-emerald-50/20">
              <div className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Проведено документов
              </div>
              <div className="text-base font-extrabold text-emerald-900 mt-0.5">
                {inventories.filter(i => i.status === 'completed').length} <span className="text-xs font-normal text-emerald-700">док.</span>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-blue-200/80 shadow-2xs">
              <div className="text-[11px] font-bold text-blue-700">Активных брендов компании</div>
              <div className="text-base font-extrabold text-blue-900 mt-0.5">
                {activeBrands.length > 0 ? activeBrands.length : 'Все (12)'} <span className="text-xs font-normal text-blue-700">бренд.</span>
              </div>
            </div>
          </div>

          {/* List Search & Filter Toolbar */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Поиск по номеру документа, ответственному, основанию..."
                value={listSearch}
                onChange={(e) => setListSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
              />
            </div>

            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
              <button
                onClick={() => setListStatusFilter('all')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                  listStatusFilter === 'all' ? "bg-white text-indigo-700 shadow-xs" : "text-gray-600 hover:text-gray-900"
                )}
              >
                Все документы
              </button>
              <button
                onClick={() => setListStatusFilter('draft')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                  listStatusFilter === 'draft' ? "bg-white text-amber-700 shadow-xs" : "text-gray-600 hover:text-gray-900"
                )}
              >
                В работе / Черновики
              </button>
              <button
                onClick={() => setListStatusFilter('completed')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                  listStatusFilter === 'completed' ? "bg-white text-emerald-700 shadow-xs" : "text-gray-600 hover:text-gray-900"
                )}
              >
                Проведенные
              </button>
            </div>
          </div>

          {/* Documents Table */}
          <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-black text-gray-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Документ</th>
                    <th className="py-3 px-4">Дата создания</th>
                    <th className="py-3 px-4">Статус</th>
                    <th className="py-3 px-4">Охват групп</th>
                    <th className="py-3 px-4">Ответственный</th>
                    <th className="py-3 px-4 text-center">Прогресс</th>
                    <th className="py-3 px-4 text-right">Расхождения (+ / -)</th>
                    <th className="py-3 px-4 text-right">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {filteredDocList.length > 0 ? (
                    filteredDocList.map(doc => {
                      const isCompleted = doc.status === 'completed';
                      const counted = doc.items.filter(i => i.isCounted).length;
                      const total = doc.items.length;
                      const pct = total > 0 ? Math.round((counted / total) * 100) : 0;

                      return (
                        <tr
                          key={doc.id}
                          onClick={() => handleOpenDoc(doc)}
                          className="hover:bg-indigo-50/40 transition-colors cursor-pointer group"
                        >
                          <td className="py-3.5 px-4 font-bold text-gray-900">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-black text-indigo-700">{doc.docNumber}</span>
                              {doc.description && (
                                <span className="text-[11px] text-gray-500 font-normal truncate max-w-[180px]">
                                  • {doc.description}
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-gray-600 font-mono text-[11px]">
                            {new Date(doc.createdAt).toLocaleDateString('ru-RU', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </td>

                          <td className="py-3.5 px-4">
                            {isCompleted ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Проведено
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-amber-100 text-amber-800 border border-amber-200">
                                <Clock className="w-3.5 h-3.5 animate-pulse" /> В процессе ({pct}%)
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                              {doc.targetGroups.slice(0, 3).map(g => (
                                <span key={g} className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-700">
                                  {g}
                                </span>
                              ))}
                              {doc.targetGroups.length > 3 && (
                                <span className="text-[10px] text-gray-400 font-bold self-center">
                                  +{doc.targetGroups.length - 3}
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-gray-700 font-medium">
                            <div className="flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-gray-400" />
                              <span>{doc.responsibleName}</span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <div className="w-24 mx-auto">
                              <div className="flex justify-between text-[10px] font-bold text-gray-500 mb-1">
                                <span>{counted}/{total}</span>
                                <span>{pct}%</span>
                              </div>
                              <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className={cn(
                                    "h-full rounded-full transition-all",
                                    isCompleted ? "bg-emerald-500" : "bg-indigo-600"
                                  )}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="space-y-0.5">
                              {doc.surplusValuation > 0 && (
                                <div className="text-[11px] font-extrabold text-emerald-600">
                                  +{doc.surplusValuation.toLocaleString('ru-RU')} ₽
                                </div>
                              )}
                              {doc.shortageValuation > 0 && (
                                <div className="text-[11px] font-extrabold text-rose-600">
                                  -{doc.shortageValuation.toLocaleString('ru-RU')} ₽
                                </div>
                              )}
                              {doc.surplusValuation === 0 && doc.shortageValuation === 0 && (
                                <div className="text-[11px] text-gray-400 font-medium">
                                  Совпадает (0 ₽)
                                </div>
                              )}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => handleOpenDoc(doc)}
                                className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg text-xs transition-colors flex items-center gap-1"
                              >
                                <span>{isCompleted ? 'Просмотр' : 'Продолжить'}</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>

                              {!isCompleted && (
                                <button
                                  onClick={(e) => handleDeleteDraft(doc.id, e)}
                                  className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                                  title="Удалить черновик"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-gray-400 font-medium">
                        <Boxes className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <div>Документы инвентаризации пока не созданы</div>
                        <button
                          onClick={() => setShowCreateModal(true)}
                          className="mt-3 px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl text-xs hover:bg-indigo-700 cursor-pointer"
                        >
                          Начать первую инвентаризацию
                        </button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          VIEW MODE 2: ACTIVE INVENTORY EDITOR / AUDIT SHEET
          (РАБОЧИЙ ЭКРАН ПЕРЕСЧЕТА И ВЕДОМОСТИ)
          ======================================================== */}
      {viewMode === 'editor' && currentDoc && (
        <div className="space-y-4">
          {/* Header Action Bar */}
          <div className="bg-white rounded-2xl p-5 border border-gray-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  saveInventoryDoc(currentDoc);
                  setViewMode('list');
                }}
                className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors cursor-pointer"
                title="Назад к списку документов"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">
                    {currentDoc.docNumber}
                  </h1>
                  {currentDoc.status === 'completed' ? (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Проведено
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> В процессе (Черновик)
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-0.5 flex flex-wrap items-center gap-2">
                  <span>Основание: <strong>{currentDoc.description || 'Инвентаризация ТМЦ'}</strong></span>
                  <span>•</span>
                  <span>Ответственный: <strong>{currentDoc.responsibleName}</strong></span>
                  <span>•</span>
                  <span>Дата фиксации: <strong>{new Date(currentDoc.snapshotDate).toLocaleDateString('ru-RU')}</strong></span>
                </div>
              </div>
            </div>

            {/* Actions for Editor */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setViewMode('print')}
                className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                title="Печатная форма описи ИНВ-3"
              >
                <Printer className="w-4 h-4 text-gray-600" />
                <span>Печать описи</span>
              </button>

              {currentDoc.status !== 'completed' && (
                <>
                  <button
                    onClick={() => {
                      saveInventoryDoc(currentDoc);
                      alert('Черновик успешно сохранен на сервере! Вы можете продолжить в любой момент.');
                    }}
                    disabled={isSaving}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSaving ? 'Сохранение...' : 'Сохранить черновик'}</span>
                  </button>

                  <button
                    onClick={() => setShowCompleteConfirmModal(true)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold rounded-xl text-xs shadow-md shadow-emerald-200 flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Провести инвентаризацию</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Real-time Summary Cards & Movements Warning */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-white p-3.5 rounded-2xl border border-gray-200/90 shadow-2xs">
              <div className="text-[11px] font-bold text-gray-500">Прогресс пересчета</div>
              <div className="text-base font-extrabold text-indigo-700 mt-0.5">
                {countedCount} / {totalItemsCount} <span className="text-xs font-normal text-gray-400">({progressPercent}%)</span>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-gray-200/90 shadow-2xs">
              <div className="text-[11px] font-bold text-gray-500">Учетная стоимость</div>
              <div className="text-base font-extrabold text-gray-900 mt-0.5">
                {currentDoc.totalBookValuation.toLocaleString('ru-RU')} <span className="text-xs font-normal text-gray-400">₽</span>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-emerald-200/80 bg-emerald-50/20 shadow-2xs">
              <div className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" /> Излишки (+)
              </div>
              <div className="text-base font-extrabold text-emerald-800 mt-0.5">
                +{currentDoc.surplusValuation.toLocaleString('ru-RU')} <span className="text-xs font-normal text-emerald-700">₽</span>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-rose-200/80 bg-rose-50/20 shadow-2xs">
              <div className="text-[11px] font-bold text-rose-700 flex items-center gap-1">
                <TrendingDown className="w-3.5 h-3.5" /> Недостачи (-)
              </div>
              <div className="text-base font-extrabold text-rose-800 mt-0.5">
                -{currentDoc.shortageValuation.toLocaleString('ru-RU')} <span className="text-xs font-normal text-rose-700">₽</span>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-blue-200/80 bg-blue-50/20 shadow-2xs">
              <div className="text-[11px] font-bold text-blue-700">Итоговый баланс</div>
              <div className={cn(
                "text-base font-extrabold mt-0.5",
                (currentDoc.surplusValuation - currentDoc.shortageValuation) >= 0 ? "text-emerald-800" : "text-rose-800"
              )}>
                {((currentDoc.surplusValuation - currentDoc.shortageValuation) > 0 ? '+' : '')}
                {(currentDoc.surplusValuation - currentDoc.shortageValuation).toLocaleString('ru-RU')} <span className="text-xs font-normal">₽</span>
              </div>
            </div>
          </div>

          {/* Warehouse Movement Sync Notice */}
          <div className="p-3 bg-indigo-50/60 rounded-2xl border border-indigo-100 flex items-start gap-2.5 text-xs text-indigo-900">
            <HelpCircle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <strong>Интеллектуальный учет движений ТМЦ:</strong> Система отслеживает приходы и списания со склада с даты фиксации остатков ({new Date(currentDoc.snapshotDate).toLocaleDateString('ru-RU')}). В колонке <strong>«К учету»</strong> учитываются все зарегистрированные перемещения за период проведения ревизии. Вы можете прервать работу, закрыть документ и продолжить пересчет на следующий день!
            </div>
          </div>

          {/* Filter Bar inside Editor */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200/90 shadow-xs space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Поиск по наименованию, артикулу, ячейке хранения..."
                  value={editorSearch}
                  onChange={(e) => setEditorSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              {currentDoc.status !== 'completed' && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleFillAllWithBook}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Заполнить факт = учет
                  </button>
                </div>
              )}
            </div>

            {/* Filter pills */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100">
              <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar">
                <span className="text-xs font-bold text-gray-400 mr-1 shrink-0">Группа:</span>
                {['all', ...currentDoc.targetGroups].map(g => (
                  <button
                    key={g}
                    onClick={() => setEditorCategoryFilter(g)}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
                      editorCategoryFilter === g ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    )}
                  >
                    {g === 'all' ? 'Все группы' : g}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setEditorDiscrepancyFilter('all')}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                    editorDiscrepancyFilter === 'all' ? "bg-slate-800 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  )}
                >
                  Все ({currentDoc.items.length})
                </button>
                <button
                  onClick={() => setEditorDiscrepancyFilter('discrepancy_only')}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                    editorDiscrepancyFilter === 'discrepancy_only' ? "bg-amber-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  )}
                >
                  Только с расхождениями ({currentDoc.items.filter(i => i.discrepancy !== 0).length})
                </button>
                <button
                  onClick={() => setEditorDiscrepancyFilter('uncounted')}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                    editorDiscrepancyFilter === 'uncounted' ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  )}
                >
                  Не посчитанные ({currentDoc.items.filter(i => !i.isCounted).length})
                </button>
              </div>
            </div>
          </div>

          {/* Audit Sheet Table */}
          <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs overflow-hidden">
            <div className="overflow-x-auto max-h-[580px]">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 border-b border-gray-200 text-[10px] font-black text-gray-500 uppercase tracking-wider sticky top-0 z-10">
                  <tr>
                    <th className="py-2.5 px-3 w-10 text-center">№</th>
                    <th className="py-2.5 px-3">Наименование номенклатуры</th>
                    <th className="py-2.5 px-3 w-28">Ячейка</th>
                    <th className="py-2.5 px-3 w-20 text-center">Ед.</th>
                    <th className="py-2.5 px-3 w-24 text-right">Нач. Учет</th>
                    <th className="py-2.5 px-3 w-28 text-center" title="Движения по складу за время ревизии">
                      Движения
                    </th>
                    <th className="py-2.5 px-3 w-24 text-right">К учету</th>
                    <th className="py-2.5 px-3 w-40 text-center">ФАКТ (Пересчет)</th>
                    <th className="py-2.5 px-3 w-24 text-right">Разница</th>
                    <th className="py-2.5 px-3 w-28 text-right">Сумма (₽)</th>
                    <th className="py-2.5 px-3 min-w-[140px]">Причина расхождения</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {filteredEditorItems.length > 0 ? (
                    filteredEditorItems.map((item, idx) => {
                      const hasDiscrepancy = item.discrepancy !== 0;
                      const isSurplus = item.discrepancy > 0;
                      const isShortage = item.discrepancy < 0;

                      return (
                        <tr
                          key={item.itemId}
                          className={cn(
                            "hover:bg-gray-50/80 transition-colors",
                            hasDiscrepancy && isSurplus && "bg-emerald-50/20",
                            hasDiscrepancy && isShortage && "bg-rose-50/20",
                            !item.isCounted && "opacity-80"
                          )}
                        >
                          <td className="py-2.5 px-3 text-center text-gray-400 font-mono text-[11px]">
                            {idx + 1}
                          </td>

                          <td className="py-2.5 px-3 font-bold text-gray-900">
                            <div className="flex flex-col">
                              <span>{item.name}</span>
                              <div className="flex items-center gap-2 text-[10px] text-gray-400 font-normal">
                                {item.sku && <span>Арт: {item.sku}</span>}
                                {item.category && <span>• {item.category}</span>}
                                {item.brand && <span>• {item.brand}</span>}
                              </div>
                            </div>
                          </td>

                          <td className="py-2.5 px-3 text-gray-600 font-mono text-[11px]">
                            {item.storageCell ? (
                              <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 font-bold border border-gray-200">
                                {item.storageCell}
                              </span>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>

                          <td className="py-2.5 px-3 text-center text-gray-500 font-bold text-[11px]">
                            {item.unit}
                          </td>

                          {/* Initial Book Qty */}
                          <td className="py-2.5 px-3 text-right font-mono text-gray-600">
                            {item.bookQty}
                          </td>

                          {/* Movements during audit */}
                          <td className="py-2.5 px-3 text-center">
                            {item.movementsDuringAudit !== 0 ? (
                              <span className={cn(
                                "px-1.5 py-0.5 rounded text-[10px] font-black font-mono",
                                item.movementsDuringAudit > 0 ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                              )}>
                                {item.movementsDuringAudit > 0 ? `+${item.movementsDuringAudit}` : item.movementsDuringAudit}
                              </span>
                            ) : (
                              <span className="text-gray-300 font-mono text-[11px]">0</span>
                            )}
                          </td>

                          {/* Adjusted Book Qty */}
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-gray-900">
                            {item.adjustedBookQty}
                          </td>

                          {/* ACTUAL QUANTITY INPUT */}
                          <td className="py-2 px-3 text-center">
                            {currentDoc.status !== 'completed' ? (
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateItemActualQty(item.itemId, item.actualQty - 1)}
                                  className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs flex items-center justify-center cursor-pointer"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={item.actualQty}
                                  onChange={(e) => handleUpdateItemActualQty(item.itemId, parseFloat(e.target.value) || 0)}
                                  className={cn(
                                    "w-16 px-1.5 py-1 text-center font-extrabold text-xs rounded-lg border outline-none font-mono focus:ring-2 focus:ring-indigo-500/30",
                                    hasDiscrepancy ? (isSurplus ? "border-emerald-400 bg-emerald-50 text-emerald-900" : "border-rose-400 bg-rose-50 text-rose-900") : "border-gray-200 bg-white text-gray-900"
                                  )}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleUpdateItemActualQty(item.itemId, item.actualQty + 1)}
                                  className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs flex items-center justify-center cursor-pointer"
                                >
                                  +
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateItemActualQty(item.itemId, item.adjustedBookQty)}
                                  className="px-1.5 py-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[10px] cursor-pointer ml-0.5"
                                  title="Установить равным учету"
                                >
                                  =Учет
                                </button>
                              </div>
                            ) : (
                              <span className="font-mono font-extrabold text-xs text-gray-900">
                                {item.actualQty}
                              </span>
                            )}
                          </td>

                          {/* Discrepancy (+/-) */}
                          <td className="py-2.5 px-3 text-right font-mono font-extrabold">
                            {hasDiscrepancy ? (
                              <span className={cn(
                                "px-1.5 py-0.5 rounded text-[11px]",
                                isSurplus ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                              )}>
                                {isSurplus ? `+${item.discrepancy}` : item.discrepancy}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-[11px]">0</span>
                            )}
                          </td>

                          {/* Discrepancy Sum in Rubles */}
                          <td className="py-2.5 px-3 text-right font-mono font-bold">
                            {item.discrepancySum !== 0 ? (
                              <span className={isSurplus ? "text-emerald-700" : "text-rose-700"}>
                                {item.discrepancySum > 0 ? `+${item.discrepancySum.toLocaleString('ru-RU')}` : item.discrepancySum.toLocaleString('ru-RU')} ₽
                              </span>
                            ) : (
                              <span className="text-gray-300">0 ₽</span>
                            )}
                          </td>

                          {/* Discrepancy Reason Input */}
                          <td className="py-2 px-3">
                            {currentDoc.status !== 'completed' ? (
                              <input
                                type="text"
                                placeholder={hasDiscrepancy ? "Укажите причину (бой, брак, пересорт)..." : "Примечание"}
                                value={item.discrepancyReason || ''}
                                onChange={(e) => handleUpdateItemReason(item.itemId, e.target.value)}
                                className={cn(
                                  "w-full px-2 py-1 text-[11px] rounded-lg border outline-none focus:ring-1 focus:ring-indigo-500",
                                  hasDiscrepancy && !item.discrepancyReason ? "border-amber-300 bg-amber-50/50" : "border-gray-200 bg-gray-50"
                                )}
                              />
                            ) : (
                              <span className="text-[11px] text-gray-600">{item.discrepancyReason || '—'}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={11} className="py-8 text-center text-gray-400 font-medium">
                        Позиции по заданным фильтрам не найдены
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          VIEW MODE 3: PRINTABLE INVENTORY ACT (ИНВ-3 / ИНВ-19)
          ======================================================== */}
      {viewMode === 'print' && currentDoc && (
        <div className="bg-white rounded-2xl p-6 sm:p-10 border border-gray-200/90 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-gray-200 no-print">
            <button
              onClick={() => setViewMode('editor')}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Вернуться к пересчету</span>
            </button>

            <button
              onClick={() => window.print()}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl text-xs flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Распечатать ведомость (ИНВ-3)</span>
            </button>
          </div>

          {/* Printable Header */}
          <div className="text-center space-y-1">
            <div className="text-xs uppercase font-mono text-gray-400 tracking-wider">
              Унифицированная форма № ИНВ-3
            </div>
            <h1 className="text-xl font-black text-gray-900 uppercase">
              ИНВЕНТАРИЗАЦИОННАЯ ОПИСЬ ТОВАРНО-МАТЕРИАЛЬНЫХ ЦЕННОСТЕЙ № {currentDoc.docNumber}
            </h1>
            <div className="text-xs text-gray-600">
              Организация: <strong>{companyName || 'Мебельное производство'}</strong> • Дата составления: <strong>{new Date(currentDoc.createdAt).toLocaleDateString('ru-RU')}</strong>
            </div>
          </div>

          <div className="text-xs text-gray-700 space-y-1 border-t border-b border-gray-100 py-3">
            <div>Основание: <strong>{currentDoc.description || 'Приказ об инвентаризации'}</strong></div>
            <div>Председатель комиссии: <strong>{currentDoc.responsibleName}</strong></div>
            {currentDoc.commissionMembers && currentDoc.commissionMembers.length > 0 && (
              <div>Члены комиссии: <strong>{currentDoc.commissionMembers.join(', ')}</strong></div>
            )}
            <div>Охват категорий ТМЦ: <strong>{currentDoc.targetGroups.join(', ')}</strong></div>
          </div>

          {/* Printable Table */}
          <table className="w-full text-left border-collapse border border-gray-300 text-[11px]">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-300 font-bold text-gray-800">
                <th className="p-2 border-r border-gray-300 w-8 text-center">№</th>
                <th className="p-2 border-r border-gray-300">Наименование номенклатуры</th>
                <th className="p-2 border-r border-gray-300 w-16 text-center">Ед. изм.</th>
                <th className="p-2 border-r border-gray-300 w-20 text-right">По учету</th>
                <th className="p-2 border-r border-gray-300 w-20 text-right">Фактически</th>
                <th className="p-2 border-r border-gray-300 w-20 text-right">Отклонение</th>
                <th className="p-2 border-r border-gray-300 w-24 text-right">Сумма (₽)</th>
                <th className="p-2 w-32">Примечание</th>
              </tr>
            </thead>
            <tbody>
              {currentDoc.items.map((item, idx) => (
                <tr key={item.itemId} className="border-b border-gray-200">
                  <td className="p-1.5 border-r border-gray-200 text-center font-mono">{idx + 1}</td>
                  <td className="p-1.5 border-r border-gray-200 font-medium">{item.name}</td>
                  <td className="p-1.5 border-r border-gray-200 text-center">{item.unit}</td>
                  <td className="p-1.5 border-r border-gray-200 text-right font-mono">{item.adjustedBookQty}</td>
                  <td className="p-1.5 border-r border-gray-200 text-right font-mono font-bold">{item.actualQty}</td>
                  <td className="p-1.5 border-r border-gray-200 text-right font-mono">
                    {item.discrepancy !== 0 ? (
                      <span className={item.discrepancy > 0 ? "text-emerald-700 font-bold" : "text-rose-700 font-bold"}>
                        {item.discrepancy > 0 ? `+${item.discrepancy}` : item.discrepancy}
                      </span>
                    ) : '0'}
                  </td>
                  <td className="p-1.5 border-r border-gray-200 text-right font-mono font-bold">
                    {item.discrepancySum !== 0 ? `${item.discrepancySum > 0 ? '+' : ''}${item.discrepancySum.toLocaleString('ru-RU')} ₽` : '0 ₽'}
                  </td>
                  <td className="p-1.5 text-[10px] text-gray-600">{item.discrepancyReason || ''}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 font-bold text-gray-900 border-t-2 border-gray-300">
                <td colSpan={3} className="p-2 text-right">ИТОГО:</td>
                <td className="p-2 text-right font-mono">{currentDoc.items.reduce((a, b) => a + b.adjustedBookQty, 0)}</td>
                <td className="p-2 text-right font-mono">{currentDoc.items.reduce((a, b) => a + b.actualQty, 0)}</td>
                <td className="p-2 text-right font-mono">
                  {currentDoc.items.reduce((a, b) => a + b.discrepancy, 0)}
                </td>
                <td className="p-2 text-right font-mono">
                  {(currentDoc.surplusValuation - currentDoc.shortageValuation).toLocaleString('ru-RU')} ₽
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>

          {/* Signatures */}
          <div className="pt-8 border-t border-gray-200 grid grid-cols-2 gap-8 text-xs text-gray-700">
            <div>
              <div className="font-bold mb-4">Председатель комиссии:</div>
              <div className="border-b border-gray-400 pb-1 flex justify-between">
                <span>{currentDoc.responsibleName}</span>
                <span className="text-gray-400">(подпись)</span>
              </div>
            </div>
            <div>
              <div className="font-bold mb-4">Материально ответственное лицо:</div>
              <div className="border-b border-gray-400 pb-1 flex justify-between">
                <span>{currentUser?.name || 'Кладовщик'}</span>
                <span className="text-gray-400">(подпись)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: CREATE NEW INVENTORY WIZARD
          ======================================================== */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl max-w-2xl w-full p-6 space-y-5 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                  <ClipboardCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-gray-900 text-lg leading-tight">
                    Создание новой инвентаризации
                  </h3>
                  <p className="text-xs text-gray-500">
                    Номер документа: <strong className="text-indigo-600">{getNextDocNumber()}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-medium text-gray-700">
              {/* Target Groups Multi-Select */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="font-bold text-gray-900 uppercase tracking-wider text-[11px]">
                    1. Группы товаров для проведения ревизии *
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setNewDocGroups([...ALL_WAREHOUSE_GROUPS])}
                      className="text-indigo-600 hover:underline text-[11px] font-bold cursor-pointer"
                    >
                      Выбрать все
                    </button>
                    <span className="text-gray-300">•</span>
                    <button
                      type="button"
                      onClick={() => setNewDocGroups([])}
                      className="text-gray-400 hover:text-gray-600 text-[11px] cursor-pointer"
                    >
                      Снять выбор
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {ALL_WAREHOUSE_GROUPS.map(group => {
                    const isChecked = newDocGroups.includes(group);
                    return (
                      <label
                        key={group}
                        className={cn(
                          "flex items-center gap-2 p-2.5 rounded-xl border transition-all cursor-pointer",
                          isChecked
                            ? "bg-indigo-50/70 border-indigo-300 text-indigo-900 font-bold"
                            : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewDocGroups(prev => [...prev, group]);
                            } else {
                              setNewDocGroups(prev => prev.filter(g => g !== group));
                            }
                          }}
                          className="w-4 h-4 text-indigo-600 rounded"
                        />
                        <span>{group}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Company Brands Filter Toggle */}
              {activeBrands.length > 0 && (
                <div className="p-3 bg-blue-50/70 rounded-2xl border border-blue-100 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-blue-900 text-xs">
                      Фильтровать по активным брендам компании ({activeBrands.length})
                    </div>
                    <div className="text-[11px] text-blue-700">
                      Исключить из ревизии товары брендов, не используемых компанией: {activeBrands.join(', ')}
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={newDocFilterActiveBrandsOnly}
                    onChange={(e) => setNewDocFilterActiveBrandsOnly(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                </div>
              )}

              {/* Responsible Person & Commission */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">
                    Ответственное лицо (Председатель комиссии) *
                  </label>
                  <input
                    type="text"
                    value={newDocResponsible}
                    onChange={(e) => setNewDocResponsible(e.target.value)}
                    placeholder="ФИО ответственного"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">
                    Члены инвентаризационной комиссии
                  </label>
                  <input
                    type="text"
                    value={newDocCommission}
                    onChange={(e) => setNewDocCommission(e.target.value)}
                    placeholder="Члены комиссии через запятую"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Description / Grounds */}
              <div>
                <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">
                  Основание проведения инвентаризации
                </label>
                <input
                  type="text"
                  value={newDocDescription}
                  onChange={(e) => setNewDocDescription(e.target.value)}
                  placeholder="Плановая ежемесячная ревизия, приказ №..."
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleCreateNewInventory}
                className="px-6 py-2.5 rounded-xl text-xs font-extrabold bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white shadow-md shadow-indigo-200 cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Сформировать опись и начать пересчет</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: CONFIRM FINAL COMPLETION OF INVENTORY
          ======================================================== */}
      {showCompleteConfirmModal && currentDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-gray-900 text-base">
                  Окончательное проведение инвентаризации
                </h3>
                <p className="text-xs text-gray-500">
                  Документ {currentDoc.docNumber} будет утвержден и заблокирован от правок
                </p>
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-2xl space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Всего позиций в описи:</span>
                <span className="font-bold text-gray-900">{currentDoc.items.length} поз.</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Пересчитано фактически:</span>
                <span className="font-bold text-indigo-700">{countedCount} из {currentDoc.items.length} поз.</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Позиций с расхождениями:</span>
                <span className="font-bold text-amber-700">{currentDoc.totalDiscrepancyCount} поз.</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-2 text-emerald-700">
                <span className="font-bold">Оприходование излишков (+):</span>
                <span className="font-extrabold">+{currentDoc.surplusValuation.toLocaleString('ru-RU')} ₽</span>
              </div>
              <div className="flex justify-between text-rose-700">
                <span className="font-bold">Списание недостач (-):</span>
                <span className="font-extrabold">-{currentDoc.shortageValuation.toLocaleString('ru-RU')} ₽</span>
              </div>
            </div>

            <div className="text-xs text-gray-500">
              При подтверждении:
              <ul className="list-disc pl-4 mt-1 space-y-1">
                <li>Физические остатки на складе ТМЦ обновятся до фактических значений</li>
                <li>Будут сформированы складские акты оприходования излишков и списания недостач</li>
                <li>Документ перейдет в статус «Проведено» и будет доступен для просмотра и печати</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowCompleteConfirmModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleConfirmCompleteInventory}
                className="px-5 py-2 rounded-xl text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-200 cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Подтвердить и провести</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

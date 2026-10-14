import React, { useState, useEffect, useMemo } from 'react';
import { 
  Package, 
  Layers, 
  Truck, 
  Lock, 
  ClipboardList, 
  MapPin, 
  Settings, 
  Plus, 
  Search, 
  Filter, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowUpRight, 
  ArrowDownRight, 
  RefreshCw, 
  Printer, 
  Edit, 
  Trash2, 
  Box, 
  Boxes, 
  Tag, 
  X, 
  Barcode, 
  Building2, 
  ListFilter, 
  RussianRuble, 
  MinusCircle, 
  Check, 
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { MaterialResidual, ERPEmployee, ProductionOrder } from '../types';
import { ERPMaterialResidualsView } from './ERPMaterialResidualsView';
import { InventoryModal } from '../../Procurement/InventoryModal';
import { ImportCalculatorCatalogModal, detectWarehouseCategory } from '../components/ImportCalculatorCatalogModal';

export interface WarehouseItem {
  id: string;
  sku?: string;
  name: string;
  category: string;
  unit: string;
  quantity: number;
  reservedQty?: number;
  availableQty?: number;
  minThreshold?: number;
  price?: number;
  supplier?: string;
  storageCell?: string;
  notes?: string;
  showInCalculator?: boolean;
  isResidual?: boolean;
  residualId?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface WarehouseMovement {
  id: string;
  date: string;
  type: 'arrival' | 'write_off' | 'transfer' | 'adjustment';
  itemId: string;
  itemName: string;
  category?: string;
  quantity: number;
  unit: string;
  fromLocation?: string;
  toLocation?: string;
  orderNumber?: string;
  performedBy: string;
  notes?: string;
}

interface WarehouseViewProps {
  residuals: MaterialResidual[];
  currentUser?: ERPEmployee | any | null;
  employees?: ERPEmployee[];
  orders?: ProductionOrder[];
  suppliers?: any[];
  companyId?: string;
  companyName?: string;
  catalogMaterials?: Record<string, string[]>;
  catalogProducts?: any[];
  onAddResidual: (item: MaterialResidual) => void;
  onUpdateResidual: (item: MaterialResidual) => void;
  onDeleteResidual: (id: string) => void;
}

const CALCULATOR_CATEGORIES = [
  'Все категории',
  'ЛДСП',
  'МДФ',
  'Фасады',
  'Кромка',
  'Фурнитура',
  'Столешницы',
  'Метизы и крепеж',
  'Химия и клей',
  'Профили и цоколи',
  'Упаковка',
  'Инструменты',
  'Другое'
];

export const WarehouseView: React.FC<WarehouseViewProps> = ({
  residuals,
  currentUser,
  employees = [],
  orders = [],
  suppliers = [],
  companyId = 'default',
  companyName,
  catalogMaterials = {},
  catalogProducts = [],
  onAddResidual,
  onUpdateResidual,
  onDeleteResidual
}) => {
  const [activeSubTab, setActiveSubTab] = useState<
    'main_stock' | 'residuals' | 'movements' | 'reservations' | 'inventory' | 'locations' | 'settings'
  >('main_stock');

  const [warehouseItems, setWarehouseItems] = useState<WarehouseItem[]>([]);
  const [movements, setMovements] = useState<WarehouseMovement[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);

  // Filters for main stock
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Все категории');
  const [typeFilter, setTypeFilter] = useState<'all' | 'regular' | 'residuals' | 'low_stock'>('all');

  // Modal states
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<WarehouseItem | null>(null);
  const [showArrivalModal, setShowArrivalModal] = useState(false);
  const [showWriteOffModal, setShowWriteOffModal] = useState(false);
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showCalculatorImportModal, setShowCalculatorImportModal] = useState(false);
  const [reservedDetailItem, setReservedDetailItem] = useState<WarehouseItem | null>(null);

  // New item form state
  const [formSku, setFormSku] = useState('');
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('ЛДСП');
  const [formUnit, setFormUnit] = useState('шт');
  const [formQuantity, setFormQuantity] = useState('0');
  const [formMinThreshold, setFormMinThreshold] = useState('0');
  const [formPrice, setFormPrice] = useState('0');
  const [formSupplier, setFormSupplier] = useState('');
  const [formStorageCell, setFormStorageCell] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formShowInCalculator, setFormShowInCalculator] = useState(true);

  // Arrival form state
  const [arrivalItemId, setArrivalItemId] = useState('');
  const [arrivalQty, setArrivalQty] = useState('1');
  const [arrivalSupplier, setArrivalSupplier] = useState('');
  const [arrivalInvoice, setArrivalInvoice] = useState('');
  const [arrivalCell, setArrivalCell] = useState('');
  const [arrivalNotes, setArrivalNotes] = useState('');

  // Write-off form state
  const [writeOffItemId, setWriteOffItemId] = useState('');
  const [writeOffQty, setWriteOffQty] = useState('1');
  const [writeOffReason, setWriteOffReason] = useState('В производство');
  const [writeOffOrderNumber, setWriteOffOrderNumber] = useState('');
  const [writeOffNotes, setWriteOffNotes] = useState('');

  // Item picker states inside modals
  const [pickerSearchQuery, setPickerSearchQuery] = useState('');
  const [pickerCategory, setPickerCategory] = useState('Все категории');

  // Warehouse settings
  const [settings, setSettings] = useState({
    autoDeductOnDispatch: true,
    allowBackorder: true,
    inventoryAllowedEmployeeIds: [] as string[]
  });

  // Fetch items and movements from backend
  const fetchWarehouseData = async () => {
    setIsLoadingItems(true);
    try {
      const [itemsRes, movRes, setRes] = await Promise.all([
        fetch(`/api/companies/${companyId}/warehouse-items`),
        fetch(`/api/companies/${companyId}/warehouse-movements`),
        fetch(`/api/companies/${companyId}/warehouse-settings`)
      ]);

      if (itemsRes.ok) {
        const data = await itemsRes.json();
        if (data.items && Array.isArray(data.items)) {
          setWarehouseItems(data.items);
        }
      }

      if (movRes.ok) {
        const data = await movRes.json();
        if (data.movements && Array.isArray(data.movements)) {
          setMovements(data.movements);
        }
      }

      if (setRes.ok) {
        const data = await setRes.json();
        if (data.settings) {
          setSettings(data.settings);
        }
      }
    } catch (err) {
      console.error('Error fetching warehouse data:', err);
    } finally {
      setIsLoadingItems(false);
    }
  };

  useEffect(() => {
    fetchWarehouseData();
  }, [companyId]);

  // Automated background sync between catalog products/materials and warehouse items
  useEffect(() => {
    if ((!catalogProducts || catalogProducts.length === 0) && (!catalogMaterials || Object.keys(catalogMaterials).length === 0)) return;

    setWarehouseItems(prev => {
      const existingNameSet = new Set(prev.map(w => w.name.toLowerCase().trim()));
      const existingSkuSet = new Set(prev.map(w => (w.sku || '').toLowerCase().trim()).filter(Boolean));
      const newItems: WarehouseItem[] = [];

      // 1. Catalog Products
      (catalogProducts || []).forEach((p: any, idx: number) => {
        const name = (p.name || p.title || '').trim();
        if (!name) return;
        const rawSku = (p.sku || p.article || p.code || (Array.isArray(p.accountingSkus) ? p.accountingSkus[0] : '') || '').trim();
        const category = detectWarehouseCategory(name, p.category || p.customCategory);

        if (!existingNameSet.has(name.toLowerCase()) && (!rawSku || !existingSkuSet.has(rawSku.toLowerCase()))) {
          const newItem: WarehouseItem = {
            id: `wh-item-auto-${p.id || idx}-${Date.now()}`,
            sku: rawSku || '',
            name,
            category,
            unit: p.unit || (category === 'ЛДСП' || category === 'МДФ' ? 'лист' : category === 'Кромка' ? 'м.п.' : 'шт'),
            quantity: 0,
            reservedQty: 0,
            availableQty: 0,
            minThreshold: 0,
            price: Number(p.purchasePrice || p.price || p.cost) || 0,
            supplier: p.supplier || p.brand || p.manufacturer || '',
            storageCell: '',
            notes: '',
            showInCalculator: true,
            isResidual: false,
            updatedAt: new Date().toISOString(),
            updatedBy: 'Система (Авто-синхронизация)'
          };
          newItems.push(newItem);
          existingNameSet.add(name.toLowerCase());
          if (rawSku) existingSkuSet.add(rawSku.toLowerCase());
        }
      });

      // 2. Catalog Materials
      Object.entries(catalogMaterials || {}).forEach(([brand, decors]) => {
        if (!Array.isArray(decors)) return;
        decors.forEach((decor: any) => {
          if (!decor || typeof decor !== 'string') return;
          const cleanDecor = decor.trim();
          const fullName = `${brand} ${cleanDecor}`;
          if (!existingNameSet.has(fullName.toLowerCase())) {
            const newItem: WarehouseItem = {
              id: `wh-item-auto-mat-${brand}_${cleanDecor.replace(/\s+/g, '_')}-${Date.now()}`,
              sku: '',
              name: fullName,
              category: fullName.toLowerCase().includes('кромка') ? 'Кромка' : 'ЛДСП',
              unit: fullName.toLowerCase().includes('кромка') ? 'м.п.' : 'лист',
              quantity: 0,
              reservedQty: 0,
              availableQty: 0,
              minThreshold: 0,
              price: 0,
              supplier: brand,
              storageCell: '',
              notes: '',
              showInCalculator: true,
              isResidual: false,
              updatedAt: new Date().toISOString(),
              updatedBy: 'Система (Авто-синхронизация)'
            };
            newItems.push(newItem);
            existingNameSet.add(fullName.toLowerCase());
          }
        });
      });

      if (newItems.length > 0) {
        fetch(`/api/companies/${companyId}/warehouse-items/bulk`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: newItems })
        }).catch(() => {});

        return [...newItems, ...prev];
      }

      return prev;
    });
  }, [catalogProducts, catalogMaterials, companyId]);

  // Count items from calculator not yet on warehouse
  const missingCalcCount = useMemo(() => {
    const existingNames = new Set(warehouseItems.map(w => w.name.toLowerCase().trim()));
    let count = 0;

    (catalogProducts || []).forEach(p => {
      const name = (p.name || p.title || '').trim().toLowerCase();
      if (name && !existingNames.has(name)) count++;
    });

    Object.entries(catalogMaterials || {}).forEach(([brand, decors]) => {
      if (Array.isArray(decors)) {
        decors.forEach(decor => {
          if (typeof decor === 'string') {
            const fullName = `${brand} ${decor.trim()}`.toLowerCase();
            if (!existingNames.has(fullName)) count++;
          }
        });
      }
    });

    return count;
  }, [catalogProducts, catalogMaterials, warehouseItems]);

  // Combine custom warehouse items AND active material residuals
  const combinedStockList = useMemo(() => {
    const list: WarehouseItem[] = [...warehouseItems];

    const activeResiduals = residuals.filter(r => r.status !== 'disposed' && r.status !== 'used');
    
    activeResiduals.forEach(res => {
      let unit = 'шт';
      let qty = res.quantity || 1;
      let displayDimensions = '';

      if (res.type === 'offcut') {
        unit = 'м²';
        qty = res.areaM2 || 1;
        if (res.lengthMm && res.widthMm) {
          displayDimensions = `(${res.lengthMm}x${res.widthMm}x${res.thicknessMm || 16}мм)`;
        }
      } else if (res.type === 'edge') {
        unit = 'м.п.';
        qty = res.lengthMeters || 1;
      } else if (res.type === 'plinth' || res.type === 'light_profile' || res.type === 'gola_profile') {
        unit = 'м.п.';
        qty = res.lengthMeters || (res.lengthMm ? Number((res.lengthMm / 1000).toFixed(2)) : 1);
        if (res.lengthMm) {
          displayDimensions = `(${res.lengthMm} мм)`;
        }
      } else if (res.type === 'countertop' || res.type === 'wall_panel') {
        unit = 'шт';
        if (res.lengthMm && res.widthMm) {
          displayDimensions = `(${res.lengthMm}x${res.widthMm} мм)`;
        }
      }

      list.push({
        id: `residual-item-${res.id}`,
        sku: '',
        name: `${res.materialName || res.category} ${displayDimensions}`.trim(),
        category: res.category || 'Деловые обрезки',
        unit: unit,
        quantity: qty,
        reservedQty: (res.status as string) === 'reserved' ? qty : 0,
        availableQty: res.status === 'available' ? qty : 0,
        minThreshold: 0,
        storageCell: res.storageCell || 'Стеллаж остатков',
        notes: res.notes ? `Остаток: ${res.notes}` : 'Остаток',
        isResidual: true,
        residualId: res.id,
        updatedAt: res.addedAt,
        updatedBy: res.addedByEmployeeName
      });
    });

    return list;
  }, [warehouseItems, catalogMaterials, residuals]);

  // Filtered stock list
  const filteredStock = useMemo(() => {
    return combinedStockList.filter(item => {
      if (selectedCategory !== 'Все категории' && item.category !== selectedCategory) {
        return false;
      }

      if (typeFilter === 'regular' && item.isResidual) return false;
      if (typeFilter === 'residuals' && !item.isResidual) return false;
      if (typeFilter === 'low_stock' && item.quantity > (item.minThreshold || 0)) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.name.toLowerCase().includes(q) ||
          (item.sku && item.sku.toLowerCase().includes(q)) ||
          (item.category && item.category.toLowerCase().includes(q)) ||
          (item.storageCell && item.storageCell.toLowerCase().includes(q)) ||
          (item.notes && item.notes.toLowerCase().includes(q))
        );
      }

      return true;
    });
  }, [combinedStockList, selectedCategory, typeFilter, searchQuery]);

  // Statistics & Valuation calculation
  const stats = useMemo(() => {
    const totalItemsCount = combinedStockList.length;
    const regularItems = combinedStockList.filter(i => !i.isResidual);
    const residualItems = combinedStockList.filter(i => i.isResidual);
    const lowStockCount = regularItems.filter(i => i.quantity <= (i.minThreshold || 0)).length;
    
    const totalStockValuation = regularItems.reduce((sum, item) => sum + (item.quantity * (item.price || 0)), 0);

    const totalResidualAreaM2 = residuals
      .filter(r => r.type === 'offcut' && r.status === 'available')
      .reduce((acc, r) => acc + (r.areaM2 || 0), 0);

    const totalResidualEdgesMeters = residuals
      .filter(r => r.type === 'edge' && r.status === 'available')
      .reduce((acc, r) => acc + (r.lengthMeters || 0), 0);

    return {
      totalItemsCount,
      regularCount: regularItems.length,
      residualCount: residualItems.length,
      lowStockCount,
      totalStockValuation: Math.round(totalStockValuation),
      totalResidualAreaM2: Number(totalResidualAreaM2.toFixed(1)),
      totalResidualEdgesMeters: Number(totalResidualEdgesMeters.toFixed(1))
    };
  }, [combinedStockList, residuals]);

  // Find reserving orders for a specific item
  const getReservingOrdersForItem = (item: WarehouseItem) => {
    if (!item || !orders) return [];
    const nameLower = item.name.toLowerCase().trim();
    
    return orders.filter(ord => {
      if (ord.isDeleted || ord.status === 'completed' || ord.status === 'shipped') return false;
      
      const matchName = (ord.projectName || (ord as any).productName || '').toLowerCase().includes(nameLower) ||
        ((ord as any).materialColor || '').toLowerCase().includes(nameLower);

      return matchName || ((ord as any).hardwareData && String((ord as any).hardwareData).toLowerCase().includes(nameLower));
    });
  };

  // Handlers for adding custom warehouse item
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const qty = Number(formQuantity) || 0;
    const minThr = Number(formMinThreshold) || 0;
    const priceVal = Number(formPrice) || 0;

    const newItem: WarehouseItem = {
      id: editingItem ? editingItem.id : `wh-item-${Date.now()}`,
      sku: formSku.trim() || '',
      name: formName.trim(),
      category: formCategory,
      unit: formUnit,
      quantity: qty,
      reservedQty: editingItem ? editingItem.reservedQty : 0,
      availableQty: editingItem ? (qty - (editingItem.reservedQty || 0)) : qty,
      minThreshold: minThr,
      price: priceVal,
      supplier: formSupplier.trim(),
      storageCell: formStorageCell.trim(),
      notes: formNotes.trim(),
      showInCalculator: formShowInCalculator,
      isResidual: false,
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser?.name || 'Кладовщик'
    };

    setWarehouseItems(prev => {
      const exists = prev.some(i => i.id === newItem.id);
      if (exists) {
        return prev.map(i => i.id === newItem.id ? newItem : i);
      }
      return [newItem, ...prev];
    });

    try {
      await fetch(`/api/companies/${companyId}/warehouse-items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem)
      });
    } catch (err) {
      console.error('Error saving warehouse item:', err);
    }

    setShowAddItemModal(false);
    setEditingItem(null);
    resetForm();
  };

  const resetForm = () => {
    setFormSku('');
    setFormName('');
    setFormCategory('ЛДСП');
    setFormUnit('шт');
    setFormQuantity('0');
    setFormMinThreshold('0');
    setFormPrice('0');
    setFormSupplier('');
    setFormStorageCell('');
    setFormNotes('');
    setFormShowInCalculator(true);
  };

  // Process arrival document
  const handleProcessArrival = async (e: React.FormEvent) => {
    e.preventDefault();
    const item = combinedStockList.find(i => i.id === arrivalItemId);
    if (!item) return;

    const qty = Number(arrivalQty) || 1;
    
    if (item.isResidual && item.residualId) {
      const res = residuals.find(r => r.id === item.residualId);
      if (res) {
        onUpdateResidual({
          ...res,
          quantity: (res.quantity || 1) + qty,
          storageCell: arrivalCell.trim() || res.storageCell
        });
      }
    } else {
      const newQty = item.quantity + qty;
      const updatedItem = {
        ...item,
        quantity: newQty,
        availableQty: newQty - (item.reservedQty || 0),
        storageCell: arrivalCell.trim() || item.storageCell,
        supplier: arrivalSupplier.trim() || item.supplier
      };

      setWarehouseItems(prev => prev.map(i => i.id === item.id ? updatedItem : i));

      try {
        await fetch(`/api/companies/${companyId}/warehouse-items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedItem)
        });
      } catch (err) {
        console.error('Error updating item on arrival:', err);
      }
    }

    const newMovement: WarehouseMovement = {
      id: `mov-${Date.now()}`,
      date: new Date().toISOString(),
      type: 'arrival',
      itemId: item.id,
      itemName: item.name,
      category: item.category,
      quantity: qty,
      unit: item.unit,
      toLocation: arrivalCell || item.storageCell || 'Склад',
      performedBy: currentUser?.name || 'Кладовщик',
      notes: `Накладная: ${arrivalInvoice || 'Б/Н'}. ${arrivalNotes || ''}`.trim()
    };

    setMovements(prev => [newMovement, ...prev]);

    try {
      await fetch(`/api/companies/${companyId}/warehouse-movements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMovement)
      });
    } catch (err) {}

    setShowArrivalModal(false);
    setArrivalItemId('');
    setArrivalQty('1');
    setArrivalInvoice('');
    setArrivalNotes('');
  };

  // Process write-off document
  const handleProcessWriteOff = async (e: React.FormEvent) => {
    e.preventDefault();
    const item = combinedStockList.find(i => i.id === writeOffItemId);
    if (!item) return;

    const qty = Number(writeOffQty) || 1;
    if (qty <= 0) return;

    if (item.isResidual && item.residualId) {
      const res = residuals.find(r => r.id === item.residualId);
      if (res) {
        const newQty = Math.max(0, (res.quantity || 1) - qty);
        onUpdateResidual({
          ...res,
          quantity: newQty,
          status: newQty === 0 ? 'used' : res.status
        });
      }
    } else {
      const newQty = Math.max(0, item.quantity - qty);
      const updatedItem = {
        ...item,
        quantity: newQty,
        availableQty: Math.max(0, newQty - (item.reservedQty || 0))
      };

      setWarehouseItems(prev => prev.map(i => i.id === item.id ? updatedItem : i));

      try {
        await fetch(`/api/companies/${companyId}/warehouse-items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedItem)
        });
      } catch (err) {}
    }

    const newMovement: WarehouseMovement = {
      id: `mov-${Date.now()}`,
      date: new Date().toISOString(),
      type: 'write_off',
      itemId: item.id,
      itemName: item.name,
      category: item.category,
      quantity: qty,
      unit: item.unit,
      fromLocation: item.storageCell || 'Склад',
      performedBy: currentUser?.name || 'Кладовщик',
      notes: `Причина: ${writeOffReason}. ${writeOffOrderNumber ? `Заказ: №${writeOffOrderNumber}. ` : ''}${writeOffNotes}`.trim()
    };

    setMovements(prev => [newMovement, ...prev]);

    try {
      await fetch(`/api/companies/${companyId}/warehouse-movements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMovement)
      });
    } catch (err) {}

    setShowWriteOffModal(false);
    setWriteOffItemId('');
    setWriteOffQty('1');
    setWriteOffOrderNumber('');
    setWriteOffNotes('');
  };

  // Delete item handler
  const handleDeleteItem = async (item: WarehouseItem) => {
    if (!confirm(`Удалить позицию "${item.name}" со склада?`)) return;

    if (item.isResidual && item.residualId) {
      onDeleteResidual(item.residualId);
    } else {
      setWarehouseItems(prev => prev.filter(i => i.id !== item.id));
      try {
        await fetch(`/api/companies/${companyId}/warehouse-items/${item.id}`, {
          method: 'DELETE'
        });
      } catch (err) {}
    }
  };

  // Filter items for item pickers inside Arrival/Write-off modals
  const filteredPickerItems = useMemo(() => {
    return combinedStockList.filter(item => {
      if (pickerCategory !== 'Все категории' && item.category !== pickerCategory) return false;
      if (pickerSearchQuery.trim()) {
        const q = pickerSearchQuery.toLowerCase();
        return (
          item.name.toLowerCase().includes(q) ||
          (item.sku && item.sku.toLowerCase().includes(q)) ||
          item.category.toLowerCase().includes(q) ||
          (item.storageCell && item.storageCell.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [combinedStockList, pickerCategory, pickerSearchQuery]);

  return (
    <div className="px-3 sm:px-6 py-4 max-w-full space-y-5 mx-auto pb-12">
      {/* Header Bar */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 flex-shrink-0">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight">Склад ТМЦ</h1>
              {companyName && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 border border-gray-200">
                  {companyName}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Единый учет материалов, фурнитуры и деловых остатков
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowCalculatorImportModal(true)}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs sm:text-sm shadow-xs transition-all flex items-center gap-1.5 cursor-pointer relative"
            title="Импорт номенклатуры из Мебельного калькулятора"
          >
            <Boxes className="w-4 h-4 text-amber-300" />
            <span>Синхронизация Калькулятора</span>
            {missingCalcCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-slate-950 ml-0.5">
                +{missingCalcCount}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              resetForm();
              setEditingItem(null);
              setShowAddItemModal(true);
            }}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold rounded-xl text-xs sm:text-sm shadow-xs transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Добавить позицию
          </button>

          <button
            onClick={() => {
              setArrivalItemId('');
              setPickerSearchQuery('');
              setPickerCategory('Все категории');
              setShowArrivalModal(true);
            }}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold rounded-xl text-xs sm:text-sm shadow-xs transition-all flex items-center gap-1.5"
          >
            <Truck className="w-4 h-4" /> Приход ТМЦ
          </button>

          <button
            onClick={() => {
              setWriteOffItemId('');
              setPickerSearchQuery('');
              setPickerCategory('Все категории');
              setShowWriteOffModal(true);
            }}
            className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-semibold rounded-xl text-xs sm:text-sm shadow-xs transition-all flex items-center gap-1.5"
          >
            <MinusCircle className="w-4 h-4" /> Списание ТМЦ
          </button>

          <button
            onClick={() => setShowInventoryModal(true)}
            className="px-3.5 py-2 bg-white hover:bg-gray-50 text-gray-700 font-semibold rounded-xl text-xs sm:text-sm border border-gray-300 transition-all flex items-center gap-1.5"
          >
            <ClipboardList className="w-4 h-4 text-gray-500" /> Инвентаризация
          </button>
        </div>
      </div>

      {/* Stats & Valuation Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl p-3.5 border border-gray-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-medium text-gray-500">Всего наименований</div>
            <div className="text-base font-bold text-gray-900 mt-0.5">
              {stats.totalItemsCount} <span className="text-xs font-normal text-gray-500">поз.</span>
            </div>
          </div>
          <div className="text-[10px] text-right text-gray-400 font-mono">
            {stats.regularCount} осн.<br/>{stats.residualCount} обрез.
          </div>
        </div>

        <div className="bg-white rounded-2xl p-3.5 border border-gray-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-medium text-blue-700 flex items-center gap-1">
              <RussianRuble className="w-3.5 h-3.5 text-blue-600" /> Стоимость запасов
            </div>
            <div className="text-base font-bold text-blue-900 mt-0.5">
              {stats.totalStockValuation.toLocaleString('ru-RU')} <span className="text-xs font-normal text-blue-700">₽</span>
            </div>
          </div>
          <div className="text-[10px] text-right text-blue-600 font-medium">
            Учетная стоимость<br/>на складе
          </div>
        </div>

        <div className="bg-white rounded-2xl p-3.5 border border-gray-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-medium text-amber-800 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-amber-600" /> Обрезки и остатки
            </div>
            <div className="text-base font-bold text-amber-900 mt-0.5">
              {stats.totalResidualAreaM2} <span className="text-xs font-normal text-amber-800">м²</span>
            </div>
          </div>
          <div className="text-[10px] text-right text-amber-700 font-medium">
            + {stats.totalResidualEdgesMeters} м.п.<br/>кромки
          </div>
        </div>

        <div className="bg-white rounded-2xl p-3.5 border border-gray-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-medium text-rose-700 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500" /> Позиции в дефиците
            </div>
            <div className="text-base font-bold text-rose-900 mt-0.5">
              {stats.lowStockCount} <span className="text-xs font-normal text-rose-700">поз.</span>
            </div>
          </div>
          <div className="text-[10px] text-right text-rose-600 font-medium">
            Ниже мин.<br/>порога
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="bg-white p-2 rounded-2xl border border-gray-200/90 shadow-xs flex items-center gap-1 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveSubTab('main_stock')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
            activeSubTab === 'main_stock'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          }`}
        >
          <Package className="w-4 h-4" /> Общий склад ТМЦ
        </button>

        <button
          onClick={() => setActiveSubTab('residuals')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
            activeSubTab === 'residuals'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          }`}
        >
          <Layers className="w-4 h-4 text-amber-500" /> Деловые обрезки и остатки
          {stats.residualCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded-full text-[10px] font-black">
              {stats.residualCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('movements')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
            activeSubTab === 'movements'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          }`}
        >
          <Truck className="w-4 h-4" /> Журнал операций и списаний
        </button>

        <button
          onClick={() => setActiveSubTab('reservations')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
            activeSubTab === 'reservations'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          }`}
        >
          <Lock className="w-4 h-4" /> Резервы под заказы
        </button>

        <button
          onClick={() => setActiveSubTab('locations')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
            activeSubTab === 'locations'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          }`}
        >
          <MapPin className="w-4 h-4" /> Адресное хранение
        </button>

        <button
          onClick={() => setShowSettingsModal(true)}
          className="ml-auto px-3 py-2.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
          title="Настройки склада"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* TAB 1: MAIN STOCK & INVENTORY TABLE */}
      {activeSubTab === 'main_stock' && (
        <div className="space-y-4">
          {/* Filters & Control Bar */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200/90 shadow-xs space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Поиск по артикулу, наименованию, категории, ячейке..."
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Calculator Category Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar pt-1 border-t border-gray-100">
              {CALCULATOR_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    selectedCategory === cat
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Quick Type Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar pt-1">
              <span className="text-xs font-bold text-gray-400 mr-1 flex items-center gap-1">
                <ListFilter className="w-3.5 h-3.5" /> Вид:
              </span>
              
              <button
                onClick={() => setTypeFilter('all')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                  typeFilter === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Все позиции ({combinedStockList.length})
              </button>

              <button
                onClick={() => setTypeFilter('regular')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                  typeFilter === 'regular'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Основные товары ({stats.regularCount})
              </button>

              <button
                onClick={() => setTypeFilter('residuals')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1 ${
                  typeFilter === 'residuals'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'bg-amber-50 text-amber-800 border border-amber-200/70 hover:bg-amber-100'
                }`}
              >
                <Tag className="w-3 h-3" /> Деловые остатки ({stats.residualCount})
              </button>

              <button
                onClick={() => setTypeFilter('low_stock')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1 ${
                  typeFilter === 'low_stock'
                    ? 'bg-rose-600 text-white'
                    : 'bg-rose-50 text-rose-700 border border-rose-200/70 hover:bg-rose-100'
                }`}
              >
                <AlertTriangle className="w-3 h-3" /> Ниже минимума ({stats.lowStockCount})
              </button>
            </div>
          </div>

          {/* Main Table */}
          <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-200/90 text-[11px] font-black uppercase text-gray-500 tracking-wider">
                    <th className="py-3 px-4">Артикул</th>
                    <th className="py-3 px-4">Наименование ТМЦ</th>
                    <th className="py-3 px-4">Категория</th>
                    <th className="py-3 px-4 text-right">Закупка (₽)</th>
                    <th className="py-3 px-4 text-center">Остаток</th>
                    <th className="py-3 px-4 text-center">В резерве</th>
                    <th className="py-3 px-4 text-center">Свободно</th>
                    <th className="py-3 px-4 text-right">Сумма (₽)</th>
                    <th className="py-3 px-4">Ячейка / Адрес</th>
                    <th className="py-3 px-4">Примечание</th>
                    <th className="py-3 px-4 text-right">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs font-medium text-gray-700">
                  {filteredStock.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-12 text-center text-gray-400">
                        <Box className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                        По вашему запросу не найдено ни одной позиции на складе.
                      </td>
                    </tr>
                  ) : (
                    filteredStock.map((item) => {
                      const isLow = !item.isResidual && item.quantity <= (item.minThreshold || 0);
                      const itemTotalValue = item.quantity * (item.price || 0);

                      return (
                        <tr 
                          key={item.id} 
                          className={`hover:bg-blue-50/30 transition-colors ${
                            item.isResidual ? 'bg-amber-50/20' : ''
                          }`}
                        >
                          {/* SKU */}
                          <td className="py-3 px-4 font-mono text-[11px] text-gray-500 font-bold">
                            {item.sku || '—'}
                          </td>

                          {/* Item Name (Clean string) */}
                          <td className="py-3 px-4 font-bold text-gray-900">
                            {item.name}
                          </td>

                          {/* Category */}
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md text-[11px] font-bold">
                              {item.category}
                            </span>
                          </td>

                          {/* Purchase Price */}
                          <td className="py-3 px-4 text-right font-mono text-gray-600">
                            {item.price && item.price > 0 ? `${item.price.toLocaleString('ru-RU')} ₽` : '—'}
                          </td>

                          {/* Total Quantity */}
                          <td className="py-3 px-4 text-center font-black text-sm text-gray-900">
                            {item.quantity} <span className="text-[10px] font-normal text-gray-500">{item.unit}</span>
                          </td>

                          {/* Reserved Qty - CLICKABLE IF > 0 */}
                          <td className="py-3 px-4 text-center">
                            {item.reservedQty && item.reservedQty > 0 ? (
                              <button
                                onClick={() => setReservedDetailItem(item)}
                                className="px-2 py-0.5 bg-blue-100 hover:bg-blue-200 text-blue-800 border border-blue-300 rounded-md font-bold text-[11px] transition-all cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                                title="Нажмите, чтобы посмотреть заказы в резерве"
                              >
                                <span>{item.reservedQty} {item.unit}</span>
                                <ChevronRight className="w-3 h-3 text-blue-600" />
                              </button>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>

                          {/* Available Qty */}
                          <td className="py-3 px-4 text-center">
                            <span className={`font-black ${
                              (item.availableQty || 0) <= 0 
                                ? 'text-rose-600' 
                                : 'text-emerald-600'
                            }`}>
                              {item.availableQty ?? item.quantity} {item.unit}
                            </span>
                          </td>

                          {/* Total Inventory Value */}
                          <td className="py-3 px-4 text-right font-bold text-gray-900 font-mono">
                            {itemTotalValue > 0 ? `${Math.round(itemTotalValue).toLocaleString('ru-RU')} ₽` : '—'}
                          </td>

                          {/* Storage Cell */}
                          <td className="py-3 px-4">
                            {item.storageCell ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md">
                                <MapPin className="w-3 h-3 text-blue-500" />
                                {item.storageCell}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-[11px]">—</span>
                            )}
                          </td>

                          {/* Note / Status */}
                          <td className="py-3 px-4">
                            {item.isResidual ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-[11px] font-black">
                                {item.notes || 'Остаток'}
                              </span>
                            ) : isLow ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-100 text-rose-800 border border-rose-200 rounded-md text-[11px] font-bold">
                                <AlertTriangle className="w-3 h-3 text-rose-600" /> Порог ({item.minThreshold})
                              </span>
                            ) : (
                              <span className="text-gray-500 text-[11px]">
                                {item.notes || '—'}
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setArrivalItemId(item.id);
                                  setShowArrivalModal(true);
                                }}
                                className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-lg text-[11px] transition-all flex items-center gap-0.5 cursor-pointer"
                                title="Провести приход товара"
                              >
                                <Truck className="w-3 h-3" /> Приход
                              </button>

                              <button
                                onClick={() => {
                                  setWriteOffItemId(item.id);
                                  setShowWriteOffModal(true);
                                }}
                                className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-lg text-[11px] transition-all flex items-center gap-0.5 cursor-pointer"
                                title="Списать с актом списания"
                              >
                                <MinusCircle className="w-3 h-3" /> Списать
                              </button>

                              <button
                                onClick={() => {
                                  if (!item.isResidual) {
                                    setEditingItem(item);
                                    setFormSku(item.sku || '');
                                    setFormName(item.name);
                                    setFormCategory(item.category);
                                    setFormUnit(item.unit);
                                    setFormQuantity(String(item.quantity));
                                    setFormMinThreshold(String(item.minThreshold || 0));
                                    setFormPrice(String(item.price || 0));
                                    setFormSupplier(item.supplier || '');
                                    setFormStorageCell(item.storageCell || '');
                                    setFormNotes(item.notes || '');
                                    setFormShowInCalculator(item.showInCalculator !== false);
                                    setShowAddItemModal(true);
                                  }
                                }}
                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all cursor-pointer"
                                title="Редактировать позицию"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handleDeleteItem(item)}
                                className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                                title="Удалить позицию"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DEDICATED MATERIAL RESIDUALS */}
      {activeSubTab === 'residuals' && (
        <div className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-200/90 shadow-xs">
          <div className="mb-4 pb-3 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-amber-500" /> Остатки материалов и деловые обрезки
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Специализированный учет обрезков ЛДСП/МДФ, остатков кромки в метрах, профилей и столешниц с привязкой к заказам
              </p>
            </div>
          </div>

          <ERPMaterialResidualsView
            residuals={residuals}
            onAddResidual={onAddResidual}
            onUpdateResidual={onUpdateResidual}
            onDeleteResidual={onDeleteResidual}
            currentUser={currentUser}
            employees={employees}
            orders={orders}
            companyName={companyName}
            catalogMaterials={catalogMaterials}
            catalogProducts={catalogProducts}
          />
        </div>
      )}

      {/* TAB 3: MOVEMENTS & ARRIVALS */}
      {activeSubTab === 'movements' && (
        <div className="bg-white rounded-2xl p-6 border border-gray-200/90 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100">
            <div>
              <h3 className="text-lg font-black text-gray-900">Журнал складских операций и актов списания</h3>
              <p className="text-xs text-gray-500">Официальная история приходов, списаний в производство, брака и перемещений</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowArrivalModal(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-all shadow-md shadow-emerald-600/20"
              >
                <Truck className="w-4 h-4" /> Провести приход
              </button>
              <button
                onClick={() => setShowWriteOffModal(true)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-all shadow-md shadow-rose-600/20"
              >
                <MinusCircle className="w-4 h-4" /> Провести списание
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200/90 text-[11px] font-black uppercase text-gray-500 tracking-wider">
                  <th className="py-3 px-4">Дата и время</th>
                  <th className="py-3 px-4">Тип операции</th>
                  <th className="py-3 px-4">Наименование ТМЦ</th>
                  <th className="py-3 px-4 text-center">Количество</th>
                  <th className="py-3 px-4">Куда / Откуда</th>
                  <th className="py-3 px-4">Сотрудник</th>
                  <th className="py-3 px-4">Примечание / Основание</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs font-medium text-gray-700">
                {movements.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-gray-400">
                      Журнал движения пуст. Приходы и списания отобразятся здесь.
                    </td>
                  </tr>
                ) : (
                  movements.map((mov) => (
                    <tr key={mov.id} className="hover:bg-gray-50/60">
                      <td className="py-3 px-4 text-gray-500">
                        {new Date(mov.date).toLocaleString('ru-RU', {
                          day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                      </td>
                      <td className="py-3 px-4">
                        {mov.type === 'arrival' ? (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md font-bold text-[11px] inline-flex items-center gap-1">
                            <ArrowDownRight className="w-3 h-3 text-emerald-600" /> Приход ТМЦ
                          </span>
                        ) : mov.type === 'write_off' ? (
                          <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded-md font-bold text-[11px] inline-flex items-center gap-1">
                            <ArrowUpRight className="w-3 h-3 text-rose-600" /> Списание ТМЦ
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md font-bold text-[11px]">
                            Перемещение
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-bold text-gray-900">{mov.itemName}</td>
                      <td className="py-3 px-4 text-center font-black">
                        {mov.type === 'arrival' ? '+' : '-'}{mov.quantity} {mov.unit}
                      </td>
                      <td className="py-3 px-4 text-gray-600">{mov.toLocation || mov.fromLocation || '—'}</td>
                      <td className="py-3 px-4 text-gray-600">{mov.performedBy}</td>
                      <td className="py-3 px-4 text-gray-500">{mov.notes || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: RESERVATIONS UNDER ORDERS */}
      {activeSubTab === 'reservations' && (
        <div className="bg-white rounded-2xl p-6 border border-gray-200/90 shadow-xs space-y-4">
          <div className="pb-4 border-b border-gray-100">
            <h3 className="text-lg font-black text-gray-900">Резервы материалов под заказы клиентов</h3>
            <p className="text-xs text-gray-500">Зарезервированные листы, кромка и фурнитура по заказам из Калькулятора и ERP</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {orders.filter(o => o.status !== 'completed' && o.status !== 'shipped').map((ord) => (
              <div key={ord.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-black text-gray-900 text-sm">
                    Заказ №{ord.orderNumber || ord.id}
                  </span>
                  <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-bold">
                    {ord.clientName || 'Клиент'}
                  </span>
                </div>
                <div className="text-xs text-gray-600">
                  Изделие: <strong>{ord.projectName || (ord as any).productName || 'Мебельное изделие'}</strong>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-gray-200 text-xs space-y-1">
                  <div className="font-bold text-gray-700">Зарезервировано складом:</div>
                  <div className="text-gray-600">• Позиции заказа забронированы на складе под производство</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: LOCATIONS */}
      {activeSubTab === 'locations' && (
        <div className="bg-white rounded-2xl p-6 border border-gray-200/90 shadow-xs space-y-6">
          <div className="pb-4 border-b border-gray-100">
            <h3 className="text-lg font-black text-gray-900">Адресное хранение склада (Зоны и Стеллажи)</h3>
            <p className="text-xs text-gray-500">Структура стеллажей, ячеек и стоек для оперативного поиска фурнитуры и обрезков</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-2">
              <div className="text-xs text-blue-400 font-bold uppercase tracking-wider">Зона A</div>
              <div className="font-black text-base">Стеллаж плитных материалов</div>
              <p className="text-xs text-slate-300">Полные листы ЛДСП, МДФ, ХДФ, Фанера</p>
            </div>

            <div className="p-4 bg-amber-900/90 text-white rounded-2xl space-y-2">
              <div className="text-xs text-amber-300 font-bold uppercase tracking-wider">Зона Б</div>
              <div className="font-black text-base">Стойка деловых обрезков</div>
              <p className="text-xs text-amber-100">Деловая подрезка ЛДСП и МДФ с термоэтикетками</p>
            </div>

            <div className="p-4 bg-blue-900 text-white rounded-2xl space-y-2">
              <div className="text-xs text-blue-300 font-bold uppercase tracking-wider">Зона В</div>
              <div className="font-black text-base">Стеллаж фурнитуры и ящиков</div>
              <p className="text-xs text-blue-100">Петли, направляющие Blum/Hettich/Boyard</p>
            </div>

            <div className="p-4 bg-emerald-900 text-white rounded-2xl space-y-2">
              <div className="text-xs text-emerald-300 font-bold uppercase tracking-wider">Зона Г</div>
              <div className="font-black text-base">Стойка кромки и профилей</div>
              <p className="text-xs text-emerald-100">Рулоны кромки ПВХ, профили GOLA и подсветка</p>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL MODAL: RESERVATION ORDERS DETAIL */}
      {reservedDetailItem && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl relative space-y-4 my-8 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="font-black text-gray-900 text-base flex items-center gap-2">
                  <Lock className="w-5 h-5 text-blue-600" /> Заказы в резерве
                </h3>
                <p className="text-xs text-gray-500 mt-0.5 font-bold">
                  {reservedDetailItem.name} {reservedDetailItem.sku ? `(Арт: ${reservedDetailItem.sku})` : ''}
                </p>
              </div>
              <button 
                onClick={() => setReservedDetailItem(null)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-blue-50 rounded-2xl border border-blue-200 flex items-center justify-between">
                <span className="text-xs font-bold text-blue-900">Всего в резерве:</span>
                <span className="text-sm font-black text-blue-800">
                  {reservedDetailItem.reservedQty} {reservedDetailItem.unit}
                </span>
              </div>

              {getReservingOrdersForItem(reservedDetailItem).length === 0 ? (
                <div className="py-8 text-center text-gray-400 text-xs">
                  <Lock className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                  Позиция зарезервирована вручную или привязана к текущим производственным картам.
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {getReservingOrdersForItem(reservedDetailItem).map(ord => (
                    <div key={ord.id} className="p-3 bg-gray-50 rounded-xl border border-gray-200/90 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-extrabold text-gray-900">Заказ №{ord.orderNumber || ord.id}</div>
                        <div className="text-gray-500">{ord.clientName || 'Клиент'} • {ord.projectName || (ord as any).productName || 'Изделие'}</div>
                      </div>
                      <div className="text-right">
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 font-black rounded-md">
                          {(ord as any).quantity || 1} {reservedDetailItem.unit}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 flex justify-end border-t border-gray-100">
              <button
                onClick={() => setReservedDetailItem(null)}
                className="px-5 py-2 bg-slate-900 text-white rounded-xl font-bold text-xs shadow-xs"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD/EDIT ITEM MODAL */}
      {showAddItemModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl relative space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="font-black text-gray-900 text-base">
                {editingItem ? 'Редактирование позиции склада' : 'Новая позиция на склад'}
              </h3>
              <button 
                onClick={() => setShowAddItemModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-3 text-xs font-medium text-gray-700">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-bold text-gray-700">Артикул</label>
                  <input
                    type="text"
                    value={formSku}
                    onChange={(e) => setFormSku(e.target.value)}
                    placeholder="Например: 101-002 или Blum 71B3550"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 font-mono"
                  />
                </div>

                <div>
                  <label className="block mb-1 font-bold text-gray-700">Категория *</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 font-bold"
                  >
                    {CALCULATOR_CATEGORIES.filter(c => c !== 'Все категории').map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block mb-1 font-bold text-gray-700">Наименование позиции *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="например: Петля Blum Clip Top 110° с доводчиком"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 font-bold text-gray-900"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block mb-1 font-bold text-gray-700">Наличие *</label>
                  <input
                    type="number"
                    required
                    step="any"
                    value={formQuantity}
                    onChange={(e) => setFormQuantity(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 font-bold"
                  />
                </div>

                <div>
                  <label className="block mb-1 font-bold text-gray-700">Ед. изм. *</label>
                  <select
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="шт">шт</option>
                    <option value="лист">лист</option>
                    <option value="м²">м²</option>
                    <option value="м.п.">м.п.</option>
                    <option value="кг">кг</option>
                    <option value="компл">компл</option>
                  </select>
                </div>

                <div>
                  <label className="block mb-1 font-bold text-gray-700">Мин. порог</label>
                  <input
                    type="number"
                    value={formMinThreshold}
                    onChange={(e) => setFormMinThreshold(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-bold text-gray-700">Закупочная цена (₽)</label>
                  <input
                    type="number"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="block mb-1 font-bold text-gray-700">Ячейка / Стеллаж</label>
                  <input
                    type="text"
                    value={formStorageCell}
                    onChange={(e) => setFormStorageCell(e.target.value)}
                    placeholder="например: Стеллаж А-01"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1 font-bold text-gray-700">Поставщик</label>
                {suppliers.length > 0 ? (
                  <select
                    value={formSupplier}
                    onChange={(e) => setFormSupplier(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 font-bold bg-white"
                  >
                    <option value="">Не выбран</option>
                    {suppliers.map((s: any) => (
                      <option key={s.id || s.name} value={s.name || s.id}>{s.name}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={formSupplier}
                    onChange={(e) => setFormSupplier(e.target.value)}
                    placeholder="Укажите поставщика"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 font-bold"
                  />
                )}
              </div>

              <div className="p-3 bg-blue-50/80 rounded-xl border border-blue-200/80 space-y-1.5">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formShowInCalculator}
                    onChange={(e) => setFormShowInCalculator(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300"
                  />
                  <span className="font-extrabold text-blue-950 text-xs">
                    Отображать в Мебельном калькуляторе
                  </span>
                </label>
                <p className="text-[11px] text-blue-800/80 leading-tight">
                  При отметке данная позиция/категория будет также доступна в каталоге подбора материалов Калькулятора.
                </p>
              </div>

              <div>
                <label className="block mb-1 font-bold text-gray-700">Примечание</label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Дополнительные примечания..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddItemModal(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs shadow-md shadow-blue-600/20 cursor-pointer"
                >
                  {editingItem ? 'Сохранить изменения' : 'Добавить на склад'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ARRIVAL MODAL WITH INTERACTIVE ITEM PICKER */}
      {showArrivalModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl relative space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="font-black text-gray-900 text-base flex items-center gap-2">
                <Truck className="w-5 h-5 text-emerald-600" /> Оформление прихода ТМЦ
              </h3>
              <button 
                onClick={() => setShowArrivalModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleProcessArrival} className="space-y-3 text-xs font-medium text-gray-700">
              {/* Item Search & Selection Box */}
              <div>
                <label className="block mb-1 font-bold text-gray-700">Выберите позицию склада *</label>
                
                {/* Search & Category Filter bar */}
                <div className="space-y-2 p-3 bg-gray-50 rounded-2xl border border-gray-200">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={pickerSearchQuery}
                        onChange={(e) => setPickerSearchQuery(e.target.value)}
                        placeholder="Поиск по артикулу или названию..."
                        className="w-full pl-8 pr-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <select
                      value={pickerCategory}
                      onChange={(e) => setPickerCategory(e.target.value)}
                      className="bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-bold"
                    >
                      {CALCULATOR_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  {/* Scrollable list of matching items */}
                  <div className="max-h-40 overflow-y-auto divide-y divide-gray-100 bg-white rounded-xl border border-gray-200/80">
                    {filteredPickerItems.length === 0 ? (
                      <div className="p-3 text-center text-gray-400 text-xs">Ничего не найдено</div>
                    ) : (
                      filteredPickerItems.map(item => (
                        <div
                          key={item.id}
                          onClick={() => setArrivalItemId(item.id)}
                          className={`p-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                            arrivalItemId === item.id ? 'bg-emerald-50 border-l-4 border-emerald-600' : 'hover:bg-gray-50'
                          }`}
                        >
                          <div>
                            <div className="font-extrabold text-gray-900 text-xs flex items-center gap-1.5">
                              {item.sku && <span className="font-mono text-[10px] text-gray-500 bg-gray-100 px-1 py-0.2 rounded">{item.sku}</span>}
                              <span>{item.name}</span>
                            </div>
                            <div className="text-[10px] text-gray-500">{item.category} • Ячейка: {item.storageCell || 'Основной склад'}</div>
                          </div>
                          <div className="text-right">
                            <span className="font-black text-xs text-gray-900">{item.quantity} {item.unit}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-bold text-gray-700">Принимаемое кол-во *</label>
                  <input
                    type="number"
                    required
                    step="any"
                    min="0.1"
                    value={arrivalQty}
                    onChange={(e) => setArrivalQty(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 font-black text-sm text-emerald-600"
                  />
                </div>

                <div>
                  <label className="block mb-1 font-bold text-gray-700">№ Накладной</label>
                  <input
                    type="text"
                    value={arrivalInvoice}
                    onChange={(e) => setArrivalInvoice(e.target.value)}
                    placeholder="ПН-2024/88"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1 font-bold text-gray-700">Ячейка прихода</label>
                <input
                  type="text"
                  value={arrivalCell}
                  onChange={(e) => setArrivalCell(e.target.value)}
                  placeholder="Стеллаж А-01 / Зона приемки"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block mb-1 font-bold text-gray-700">Поставщик</label>
                {suppliers.length > 0 ? (
                  <select
                    value={arrivalSupplier}
                    onChange={(e) => setArrivalSupplier(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 font-bold bg-white"
                  >
                    <option value="">Выберите поставщика из Настроек</option>
                    {suppliers.map((s: any) => (
                      <option key={s.id || s.name} value={s.name || s.id}>{s.name}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={arrivalSupplier}
                    onChange={(e) => setArrivalSupplier(e.target.value)}
                    placeholder="Укажите поставщика"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 font-bold"
                  />
                )}
              </div>

              <div>
                <label className="block mb-1 font-bold text-gray-700">Комментарий кладовщика</label>
                <textarea
                  rows={2}
                  value={arrivalNotes}
                  onChange={(e) => setArrivalNotes(e.target.value)}
                  placeholder="Параметры партии, упаковочные листы..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowArrivalModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-bold text-xs"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={!arrivalItemId}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-600/20 disabled:opacity-50 cursor-pointer"
                >
                  Принять на склад
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WRITE-OFF MODAL WITH INTERACTIVE ITEM PICKER */}
      {showWriteOffModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl relative space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="font-black text-gray-900 text-base flex items-center gap-2">
                <MinusCircle className="w-5 h-5 text-rose-600" /> Акт списания ТМЦ со склада
              </h3>
              <button 
                onClick={() => setShowWriteOffModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleProcessWriteOff} className="space-y-3 text-xs font-medium text-gray-700">
              {/* Item Search & Selection Box */}
              <div>
                <label className="block mb-1 font-bold text-gray-700">Выберите позицию склада *</label>
                
                {/* Search & Category Filter bar */}
                <div className="space-y-2 p-3 bg-gray-50 rounded-2xl border border-gray-200">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={pickerSearchQuery}
                        onChange={(e) => setPickerSearchQuery(e.target.value)}
                        placeholder="Поиск по артикулу или названию..."
                        className="w-full pl-8 pr-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-rose-500"
                      />
                    </div>
                    <select
                      value={pickerCategory}
                      onChange={(e) => setPickerCategory(e.target.value)}
                      className="bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-bold"
                    >
                      {CALCULATOR_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  {/* Scrollable list of matching items */}
                  <div className="max-h-40 overflow-y-auto divide-y divide-gray-100 bg-white rounded-xl border border-gray-200/80">
                    {filteredPickerItems.length === 0 ? (
                      <div className="p-3 text-center text-gray-400 text-xs">Ничего не найдено</div>
                    ) : (
                      filteredPickerItems.map(item => (
                        <div
                          key={item.id}
                          onClick={() => setWriteOffItemId(item.id)}
                          className={`p-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                            writeOffItemId === item.id ? 'bg-rose-50 border-l-4 border-rose-600' : 'hover:bg-gray-50'
                          }`}
                        >
                          <div>
                            <div className="font-extrabold text-gray-900 text-xs flex items-center gap-1.5">
                              {item.sku && <span className="font-mono text-[10px] text-gray-500 bg-gray-100 px-1 py-0.2 rounded">{item.sku}</span>}
                              <span>{item.name}</span>
                            </div>
                            <div className="text-[10px] text-gray-500">{item.category} • Ячейка: {item.storageCell || 'Основной склад'}</div>
                          </div>
                          <div className="text-right">
                            <span className="font-black text-xs text-gray-900">{item.quantity} {item.unit}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-bold text-gray-700">Списываемое кол-во *</label>
                  <input
                    type="number"
                    required
                    step="any"
                    min="0.1"
                    value={writeOffQty}
                    onChange={(e) => setWriteOffQty(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-rose-500/20 font-black text-sm text-rose-600"
                  />
                </div>

                <div>
                  <label className="block mb-1 font-bold text-gray-700">Причина списания *</label>
                  <select
                    value={writeOffReason}
                    onChange={(e) => setWriteOffReason(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-rose-500/20 font-bold"
                  >
                    <option value="В производство">В производство (Заказ)</option>
                    <option value="Технологический брак">Технологический брак</option>
                    <option value="Порча / Дефект">Порча / Механический дефект</option>
                    <option value="Расход на образцы">Расход на образцы / Шоурум</option>
                    <option value="Инвентаризационная недостача">Инвентаризационная недостача</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block mb-1 font-bold text-gray-700">№ Заказа / Основание</label>
                <input
                  type="text"
                  value={writeOffOrderNumber}
                  onChange={(e) => setWriteOffOrderNumber(e.target.value)}
                  placeholder="например: Заказ №1042 или Акт-05"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <div>
                <label className="block mb-1 font-bold text-gray-700">Комментарий кладовщика</label>
                <textarea
                  rows={2}
                  value={writeOffNotes}
                  onChange={(e) => setWriteOffNotes(e.target.value)}
                  placeholder="Подробности списания..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowWriteOffModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-bold text-xs"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={!writeOffItemId}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold text-xs shadow-md shadow-rose-600/20 disabled:opacity-50 cursor-pointer"
                >
                  Провести списание
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INVENTORY AUDIT MODAL */}
      {showInventoryModal && (
        <InventoryModal
          onClose={() => setShowInventoryModal(false)}
          residuals={residuals}
          currentUser={currentUser}
          onApplyInventory={() => {
            setShowInventoryModal(false);
          }}
        />
      )}

      {/* SETTINGS MODAL */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="font-black text-gray-900 text-base flex items-center gap-2">
                <Settings className="w-5 h-5 text-slate-700" /> Настройки модуля Склад
              </h3>
              <button 
                onClick={() => setShowSettingsModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-medium text-gray-700">
              <label className="flex items-center gap-3 cursor-pointer p-3 bg-gray-50 rounded-xl border border-gray-200">
                <input
                  type="checkbox"
                  checked={settings.autoDeductOnDispatch}
                  onChange={(e) => setSettings({ ...settings, autoDeductOnDispatch: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <div>
                  <div className="font-bold text-gray-900">Автоматическое списание при отгрузке заказа</div>
                  <div className="text-[11px] text-gray-500">Списывать зарезервированные материалы со склада при статусе заказа "Отгружен"</div>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer p-3 bg-gray-50 rounded-xl border border-gray-200">
                <input
                  type="checkbox"
                  checked={settings.allowBackorder}
                  onChange={(e) => setSettings({ ...settings, allowBackorder: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <div>
                  <div className="font-bold text-gray-900">Разрешать отрицательный остаток (Backorder)</div>
                  <div className="text-[11px] text-gray-500">Позволять резервировать материалы сверх физического наличия</div>
                </div>
              </label>
            </div>

            <div className="pt-3 flex justify-end border-t border-gray-100">
              <button
                onClick={() => {
                  fetch(`/api/companies/${companyId}/warehouse-settings`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ settings })
                  }).catch(() => {});
                  setShowSettingsModal(false);
                }}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs shadow-md shadow-blue-600/20 cursor-pointer"
              >
                Сохранить настройки
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CALCULATOR CATALOG IMPORT MODAL */}
      {showCalculatorImportModal && (
        <ImportCalculatorCatalogModal
          companyId={companyId}
          catalogProducts={catalogProducts}
          catalogMaterials={catalogMaterials}
          existingWarehouseItems={warehouseItems}
          currentUser={currentUser}
          onClose={() => setShowCalculatorImportModal(false)}
          onImportComplete={(imported) => {
            setWarehouseItems(prev => [...imported, ...prev]);
          }}
        />
      )}
    </div>
  );
};

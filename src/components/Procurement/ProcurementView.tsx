import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
    Package, 
    Calendar, 
    Search, 
    RefreshCw, 
    ChevronRight, 
    Truck, 
    CheckCircle2, 
    Clock, 
    AlertCircle,
    AlertTriangle,
    X,
    FileText,
    CreditCard,
    ChevronDown,
    LayoutDashboard,
    ExternalLink,
    Plus,
    Edit2,
    Trash2,
    MessageSquare,
    Check,
    HandCoins
} from 'lucide-react';
import { Banknote } from 'lucide-react';
import { Supplier, ProcurementSettings } from '../../types';
import { cn } from '../../lib/utils';

const CATEGORIES = [
  "Фасады заказные", 
  "Фасады пильные", 
  "ЛДСП/Кромка/ХФД", 
  "Фурнитура", 
  "Зеркала/Двери/Стекла",
  "Столешницы и стеновые",
  "Столешницы и стеновые камень/компактплиты"
];

const STATUS_CONFIG = {
    'Нет в проекте': { icon: X, color: 'text-purple-600', bg: 'bg-purple-50', dot: 'bg-purple-400', border: 'border-purple-200' },
    'Не заказано': { icon: AlertCircle, color: 'text-rose-600', bg: 'bg-rose-50', dot: 'bg-rose-400', border: 'border-rose-200' },
    'Заказано': { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', dot: 'bg-amber-400', border: 'border-amber-200' },
    'Поступило': { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', dot: 'bg-emerald-400', border: 'border-emerald-200' }
};

export const ProcurementView = ({ 
    companyData, 
    settings,
    db, 
    collection, 
    onSnapshot, 
    updateDoc, 
    doc,
    setDoc,
    suppliers,
    stages
}: { 
    companyData: any; 
    settings: ProcurementSettings;
    db: any;
    collection: any;
    onSnapshot: any;
    updateDoc: any;
    doc: any;
    setDoc: any;
    suppliers: Supplier[];
    stages: { id: string; name: string }[];
}) => {
    const [orders, setOrders] = useState<any[]>([]);
    const [editingCell, setEditingCell] = useState<{order: any, category: string, currentData?: any} | null>(null);
    const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null); // null means adding a new one or viewing list
    const [showProblemsModal, setShowProblemsModal] = useState(false);
    
    const [isSyncing, setIsSyncing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortField, setSortField] = useState<'readyDate' | 'name'>('readyDate');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const scrollContainerRef = React.useRef<HTMLDivElement>(null);

    // Temp state for editing
    const [editStatus, setEditStatus] = useState('');
    const [editAmount, setEditAmount] = useState('');
    const [editSupplierId, setEditSupplierId] = useState('');
    const [editInvoice, setEditInvoice] = useState('');
    const [editArrivalDate, setEditArrivalDate] = useState('');
    const [editIsCredit, setEditIsCredit] = useState(false);

    const [categoryItems, setCategoryItems] = useState<any[]>([]);

    useEffect(() => {
        if (editingCell) {
            const catData = editingCell.order.procurementStatus?.[editingCell.category] || {};
            // Support migration: if it has status/amount directly but no items array
            let items = catData.items || [];
            if (items.length === 0 && catData.status && catData.status !== 'Не заказано') {
                items = [{
                    id: 'legacy',
                    status: catData.status,
                    actualAmount: catData.actualAmount || 0,
                    supplierId: catData.supplierId || '',
                    invoiceNumber: catData.invoiceNumber || '',
                    arrivalDate: catData.arrivalDate || ''
                }];
            }
            setCategoryItems(items);
            setEditingItemIndex(null); // Start with list view or "Add" if empty?
            // If empty, set default for adding
            if (items.length === 0) {
                setEditStatus('Не заказано');
                setEditAmount('');
                setEditSupplierId('');
                setEditInvoice('');
                setEditArrivalDate('');
                                                   setEditIsCredit(false);
                                                   setEditIsCredit(false);
                setEditIsCredit(false);
            }
        }
    }, [editingCell]);

    // Auto-scroll logic
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        let scrollInterval: any = null;
        const scrollSpeed = 15;
        const edgeSize = 100;

        const handleMouseMove = (e: MouseEvent) => {
            const rect = container.getBoundingClientRect();
            const x = e.clientX - rect.left;
            
            if (x < edgeSize && x > 0) {
                // Scroll Left
                if (!scrollInterval) {
                    scrollInterval = setInterval(() => {
                        container.scrollLeft -= scrollSpeed;
                    }, 16);
                }
            } else if (x > rect.width - edgeSize && x < rect.width) {
                // Scroll Right
                if (!scrollInterval) {
                    scrollInterval = setInterval(() => {
                        container.scrollLeft += scrollSpeed;
                    }, 16);
                }
            } else {
                if (scrollInterval) {
                    clearInterval(scrollInterval);
                    scrollInterval = null;
                }
            }
        };

        const stopScrolling = () => {
            if (scrollInterval) {
                clearInterval(scrollInterval);
                scrollInterval = null;
            }
        };

        container.addEventListener('mousemove', handleMouseMove);
        container.addEventListener('mouseleave', stopScrolling);
        
        return () => {
            container.removeEventListener('mousemove', handleMouseMove);
            container.removeEventListener('mouseleave', stopScrolling);
            stopScrolling();
        };
    }, []);

    useEffect(() => {
        if (!companyData?.id) return;
        
        const unsub = onSnapshot(collection(db, 'companies', companyData.id, 'projectSets'), (snap: any) => {
            const allOrders = snap.docs.map((doc: any) => ({
                id: doc.id,
                ...doc.data()
            }));
            
            const procurementStageId = companyData.bitrix24?.procurementStageId;
            const finalStageId = companyData.bitrix24?.procurementFinalStageId;

            if (!procurementStageId || stages.length === 0) {
                setOrders(allOrders);
            } else {
                const stageIndex = stages.findIndex(s => s.id === procurementStageId);
                const finalStageIndex = finalStageId ? stages.findIndex(s => s.id === finalStageId) : -1;
                
                if (stageIndex === -1) {
                    setOrders(allOrders); 
                } else {
                    let validStageIds: string[];
                    if (finalStageIndex !== -1 && finalStageIndex > stageIndex) {
                        validStageIds = stages.slice(stageIndex, finalStageIndex).map(s => s.id);
                    } else {
                        validStageIds = stages.slice(stageIndex).map(s => s.id);
                    }
                    setOrders(allOrders.filter((o: any) => validStageIds.includes(o.b24DealStageId)));
                }
            }
        });
        
        return unsub;
    }, [companyData?.id, db, collection, onSnapshot, stages, companyData.bitrix24?.procurementStageId]);

    const syncDeals = async () => {
        if (!companyData.bitrix24?.webhookUrl || !companyData.bitrix24?.procurementStageId) {
            alert("Настройте Bitrix24 (webhook и стадию снабжения) в настройках компании.");
            return;
        }
        
        setIsSyncing(true);
        try {
            const catId = companyData.bitrix24.procurementCategoryId || "0";
            const startStageId = companyData.bitrix24.procurementStageId;
            const finalStageId = companyData.bitrix24.procurementFinalStageId;
            
            const entityId = catId === "0" ? "DEAL_STAGE" : `DEAL_STAGE_${catId}`;
            const stagesRes = await fetch("/api/bitrix24/query", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    webhookUrl: companyData.bitrix24.webhookUrl,
                    method: "crm.status.list",
                    params: { filter: { ENTITY_ID: entityId } }
                })
            });
            const stagesText = await stagesRes.text();
            if (!stagesRes.ok || stagesText.includes("Rate exceeded")) {
                throw new Error("Bitrix24: Превышен лимит запросов. Пожалуйста, подождите минуту и попробуйте снова.");
            }
            let stagesData;
            try {
                stagesData = JSON.parse(stagesText);
            } catch (e) {
                throw new Error("Bitrix24: Неверный ответ сервера при загрузке стадий.");
            }

            const allStages = stagesData.result || [];
            const startIdx = allStages.findIndex((s: any) => s.STATUS_ID === startStageId);
            const finalIdx = finalStageId ? allStages.findIndex((s: any) => s.STATUS_ID === finalStageId) : -1;
            
            if (startIdx === -1) {
                 throw new Error("Стадия снабжения не найдена в списке стадий B24");
            }
            
            let validStageIds: string[];
            if (finalIdx !== -1 && finalIdx > startIdx) {
                validStageIds = allStages.slice(startIdx, finalIdx).map((s: any) => s.STATUS_ID);
            } else {
                validStageIds = allStages.slice(startIdx).map((s: any) => s.STATUS_ID);
            }
            
            const dealsRes = await fetch("/api/bitrix24/query", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    webhookUrl: companyData.bitrix24.webhookUrl,
                    method: "crm.deal.list",
                    params: {
                        filter: { 
                            CATEGORY_ID: Number(catId),
                            STAGE_ID: validStageIds
                        },
                        select: [
                            "ID", "TITLE", "STAGE_ID", "CLOSEDATE", "BEGINDATE",
                            ...(Object.values(companyData.bitrix24.fieldMappings || {}))
                        ]
                    }
                })
            });
            const dealsText = await dealsRes.text();
            if (!dealsRes.ok || dealsText.includes("Rate exceeded")) {
                throw new Error("Bitrix24: Превышен лимит запросов при загрузке сделок. Пожалуйста, подождите.");
            }
            let dealsData;
            try {
                dealsData = JSON.parse(dealsText);
            } catch (e) {
                throw new Error("Bitrix24: Неверный ответ сервера при загрузке сделок.");
            }
            const deals = dealsData.result || [];
            
            const mappings = companyData.bitrix24.fieldMappings || {};
            for (const deal of deals) {
                const orderId = `b24_${deal.ID}`;
                
                // Get ready date using mapping or standard CLOSEDATE
                let readyDateValue = '';
                const findField = (name: string) => {
                    if (!name) return undefined;
                    return deal[name] || deal[name.toUpperCase()] || deal[name.toLowerCase()];
                };

                if (mappings.readyDate) {
                    readyDateValue = findField(mappings.readyDate);
                }
                
                if (!readyDateValue) {
                    readyDateValue = deal.CLOSEDATE || deal.BEGINDATE || '';
                }
                
                const procurementStatus: any = {};
                const categoryMapping = {
                    "Фасады заказные": mappings.expenseCustomFacades,
                    "Фасады пильные": mappings.expenseFacades,
                    "ЛДСП/Кромка/ХФД": mappings.expenseLDSP,
                    "Фурнитура": mappings.expenseHardware,
                    "Зеркала/Двери/Стекла": mappings.expenseMirrors,
                    "Столешницы и стеновые": mappings.expenseCountertops,
                    "Столешницы и стеновые камень/компактплиты": mappings.expenseStoneCountertops,
                };

                const existingDoc = orders.find(o => o.id === orderId);
                const currentStatus = existingDoc?.procurementStatus || {};

                CATEGORIES.forEach(cat => {
                    const b24Field = (categoryMapping as any)[cat];
                    const budgetAmount = Math.floor(Number(deal[b24Field]) || 0);
                    
                    const existingData = currentStatus[cat] || {};
                    const items = existingData.items || (existingData.status && existingData.status !== 'Не заказано' ? [{
                        id: 'legacy-' + Date.now(),
                        status: existingData.status,
                        actualAmount: existingData.actualAmount || 0,
                        supplierId: existingData.supplierId || '',
                        invoiceNumber: existingData.invoiceNumber || '',
                        arrivalDate: existingData.arrivalDate || ''
                    }] : []);

                    const totalActual = items.reduce((sum: number, i: any) => sum + (Number(i.actualAmount) || 0), 0);
                    
                    // Derive status from items
                    let derivedStatus = existingData.status || 'Не заказано';
                    if (items.length > 0) {
                        const hasOrdered = items.some((i: any) => i.status === 'Заказано');
                        const hasReceived = items.every((i: any) => i.status === 'Поступило');
                        if (hasReceived) derivedStatus = 'Поступило';
                        else if (hasOrdered) derivedStatus = 'Заказано';
                    }

                    procurementStatus[cat] = {
                        amount: budgetAmount,
                        items: items,
                        status: derivedStatus,
                        actualAmount: totalActual,
                        updatedAt: existingData.updatedAt || new Date().toISOString()
                    };
                });

                await setDoc(doc(db, 'companies', companyData.id, 'projectSets', orderId), {
                    name: deal.TITLE,
                    readyDate: readyDateValue,
                    b24DealId: deal.ID,
                    b24DealStageId: deal.STAGE_ID,
                    procurementStatus,
                    updatedAt: new Date().toISOString()
                }, { merge: true });
            }
        } catch (e: any) {
            console.error("Sync error:", e);
        } finally {
            setIsSyncing(false);
        }
    };

    const handleUpdateStatus = async () => {
        if (!editingCell) return;
        setIsSyncing(true);
        
        const catData = editingCell.order.procurementStatus?.[editingCell.category] || {};
        const budgetAmount = catData.amount || 0;
        
        // If we were editing a specific item, update it in the list first
        let finalItems = [...categoryItems];
        if (editingItemIndex !== null && editingItemIndex >= 0) {
            finalItems[editingItemIndex] = {
                ...finalItems[editingItemIndex],
                status: editStatus,
                actualAmount: Number(editAmount) || 0,
                supplierId: editSupplierId,
                invoiceNumber: editInvoice,
                arrivalDate: editArrivalDate,
                isCredit: editIsCredit,
                updatedAt: new Date().toISOString()
            };
        } else if (editingItemIndex === -1) {
            // New item
            finalItems.push({
                id: Math.random().toString(36).substr(2, 9),
                status: editStatus,
                actualAmount: Number(editAmount) || 0,
                supplierId: editSupplierId,
                invoiceNumber: editInvoice,
                arrivalDate: editArrivalDate,
                isCredit: editIsCredit,
                updatedAt: new Date().toISOString()
            });
        }
        
        // Remove empty "Не заказано" items if any (though usually we don't have them in the list)
        finalItems = finalItems.filter(i => i.status !== 'Не заказано' || i.actualAmount > 0 || i.invoiceNumber);

        const actualTotal = finalItems.reduce((sum, i) => sum + (Number(i.actualAmount) || 0), 0);
        const hasOrdered = finalItems.some(i => i.status === 'Заказано');
        const hasReceived = finalItems.length > 0 && finalItems.every(i => i.status === 'Поступило');
        const hasNotInProject = finalItems.some(i => i.status === 'Нет в проекте');
        
        let primaryStatus = 'Не заказано';
        if (hasReceived) primaryStatus = 'Поступило';
        else if (hasOrdered) primaryStatus = 'Заказано';
        else if (hasNotInProject) primaryStatus = 'Нет в проекте';
        else if (finalItems.length > 0) primaryStatus = finalItems[0].status;

        try {
            // Optimistic update
            const updatedOrders = orders.map(o => {
                if (o.id === editingCell.order.id) {
                    const currentProc = o.procurementStatus || {};
                    return {
                        ...o,
                        procurementStatus: {
                            ...currentProc,
                            [editingCell.category]: {
                                amount: budgetAmount,
                                items: finalItems,
                                status: primaryStatus,
                                actualAmount: actualTotal,
                                updatedAt: new Date().toISOString()
                            }
                        }
                    };
                }
                return o;
            });
            setOrders(updatedOrders);

            // Avoid dot notation to prevent data corruption on simple merge backends
            const currentProcSync = editingCell.order.procurementStatus || {};
            const updatedProcStatus = {
                ...currentProcSync,
                [editingCell.category]: {
                    amount: budgetAmount,
                    items: finalItems,
                    status: primaryStatus,
                    actualAmount: actualTotal,
                    updatedAt: new Date().toISOString()
                }
            };

            await updateDoc(doc(db, 'companies', companyData.id, 'projectSets', editingCell.order.id), {
                procurementStatus: updatedProcStatus
            });
            setEditingCell(null);
            setEditingItemIndex(null);
        } catch (error) {
            console.error("Save error:", error);
        } finally {
            setIsSyncing(false);
        }
    };

    const getPercentColor = (percent: number) => {
        if (percent >= 100) return "bg-emerald-50 text-emerald-600 border-emerald-200";
        if (percent >= 70) return "bg-green-50 text-green-600 border-green-200";
        if (percent >= 40) return "bg-yellow-50 text-yellow-600 border-yellow-200";
        if (percent >= 15) return "bg-orange-50 text-orange-600 border-orange-200";
        return "bg-rose-50 text-rose-600 border-rose-200";
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return 'Нет даты';
        try {
            // Check if it's already a well-formatted string
            if (/^\d{2}\.\d{2}\.\d{4}$/.test(dateStr)) return dateStr;
            
            let date: Date;
            if (dateStr.includes('.')) {
                const [d, m, y] = dateStr.split('.');
                date = new Date(`${y}-${m}-${d}`);
            } else {
                date = new Date(dateStr);
            }
            
            if (!isNaN(date.getTime())) {
                return date.toLocaleDateString('ru-RU');
            }
            return dateStr;
        } catch (e) {
            return dateStr;
        }
    };

    const parseDate = (dateStr: string) => {
        if (!dateStr) return 0;
        // B24 might return ISO or DD.MM.YYYY
        if (dateStr.includes('-')) return new Date(dateStr).getTime();
        if (dateStr.includes('.')) {
            const [d, m, y] = dateStr.split('.');
            return new Date(`${y}-${m}-${d}`).getTime();
        }
        return new Date(dateStr).getTime();
    };

    const allArrivalProblems = useMemo(() => {
        let problems: {order: any, category: string, item: any, itemIndex: number}[] = [];
        orders.forEach(o => {
            Object.keys(o.procurementStatus || {}).forEach(category => {
                const cat = o.procurementStatus[category];
                (cat.items || []).forEach((item: any, itemIndex: number) => {
                    if (item.hasProblem || (item.status === 'Поступило' && (item.receivedQty || 0) < (item.qty || 0))) {
                        problems.push({ order: o, category, item, itemIndex });
                    }
                });
            });
        });
        return problems;
    }, [orders]);

    const unreadArrivalProblems = useMemo(() => {
        return allArrivalProblems.filter(p => !p.item.warehouseCommentRead);
    }, [allArrivalProblems]);

    const arrivalProblems = unreadArrivalProblems;

    const filteredOrders = useMemo(() => {
        const finalStageId = companyData?.bitrix24?.procurementFinalStageId;
        
        let result = orders.filter(o => {
            const matchesSearch = o.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                o.b24DealId?.toString().includes(searchQuery);
            
            // Exclude deals that are at or after the final stage
            // Note: If finalStageId is set, we check if the deal's current stage matches it
            const isFinalStage = finalStageId && o.b24StageId === finalStageId;
            
            return matchesSearch && !isFinalStage;
        });

        result.sort((a, b) => {
            if (sortField === 'readyDate') {
                if (!a.readyDate) return 1;
                if (!b.readyDate) return -1;
                const dateA = parseDate(a.readyDate);
                const dateB = parseDate(b.readyDate);
                return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
            } else {
                return sortDirection === 'asc' 
                    ? (a.name || '').localeCompare(b.name || '')
                    : (b.name || '').localeCompare(a.name || '');
            }
        });

        return result;
    }, [orders, searchQuery, sortField, sortDirection]);

    return (
        <div className="flex flex-col h-screen bg-[#FAFBFC] font-sans">
            {/* Top Navigation / Stats */}
            <div className="bg-white border-b border-gray-100 px-8 py-4 shrink-0 z-40">
                <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
                            <LayoutDashboard className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-gray-900 tracking-tight leading-none">Снабжение</h1>
                            <div className="flex items-center gap-2 mt-1.5">
                                <span className="flex items-center gap-1 text-[10px] font-black uppercase text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                                    <Clock className="w-2.5 h-2.5" />
                                    Активных заказов: {orders.length}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                            <input 
                                type="text"
                                placeholder="Найти проект..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 pr-4 py-2.5 bg-gray-50 border border-transparent focus:border-blue-200 focus:bg-white rounded-2xl text-sm font-bold outline-none w-64 transition-all shadow-inner"
                            />
                        </div>
                        
                        {unreadArrivalProblems.length > 0 ? (
                            <button 
                                onClick={() => setShowProblemsModal(true)}
                                className="flex items-center gap-2 px-6 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all bg-rose-50 text-rose-600 hover:bg-rose-100 hover:shadow-md border border-rose-200 animate-pulse"
                            >
                                <AlertTriangle className="w-4 h-4 animate-bounce" />
                                Приход на склад завершился с проблемой ({unreadArrivalProblems.length})
                            </button>
                        ) : (
                            <button 
                                onClick={() => setShowProblemsModal(true)}
                                className="flex items-center gap-2 px-6 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all bg-sky-50 text-sky-700 hover:bg-sky-100 hover:shadow-md border border-sky-100"
                            >
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                События склада (Ошибки)
                            </button>
                        )}
                        {companyData.procurementEnabled && (
                            <button 
                                onClick={syncDeals}
                                disabled={isSyncing}
                                className={cn(
                                    "flex items-center gap-2 px-6 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-md",
                                    isSyncing 
                                        ? "bg-gray-100 text-gray-400 cursor-not-allowed" 
                                        : "bg-blue-600 text-white hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-200"
                                )}
                            >
                                <RefreshCw className={cn("w-3.5 h-3.5", isSyncing && "animate-spin")} />
                                {isSyncing ? "Загрузка..." : "Синхронизировать"}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="p-8 flex-1 flex flex-col min-h-0">
                <div className="w-full flex-1 flex flex-col min-h-0">
                    {!companyData.procurementEnabled ? (
                        <div className="bg-white p-12 rounded-[2.5rem] border-2 border-dashed border-gray-100 flex flex-col items-center text-center">
                            <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mb-6">
                                <AlertCircle className="w-10 h-10 text-amber-400" />
                            </div>
                            <h2 className="text-2xl font-black text-gray-900">Модуль "Снабжение" выключен</h2>
                            <p className="text-gray-500 mt-2 max-w-sm font-medium">Перейдите в настройки компании, чтобы активировать этот раздел и настроить интеграцию с Bitrix24.</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-[2.5rem] border border-gray-200 shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
                                <div ref={scrollContainerRef} className="w-full flex-1 overflow-auto scrollbar-hide select-none transition-all relative">
                                    <table className="w-full text-left border-collapse table-fixed">
                                        <thead className="sticky top-0 z-[100] bg-white shadow-sm overflow-visible">
                                            <tr className="bg-gray-50/90 border-b border-gray-200 h-20">
                                                <th className="px-4 py-3 text-[11px] font-black text-gray-500 uppercase tracking-widest sticky left-0 top-0 bg-gray-50 z-[110] w-48 shadow-[2px_0_5px_rgba(0,0,0,0.05)] border-r border-gray-200 align-middle text-center">
                                                    <button 
                                                        onClick={() => {
                                                            if (sortField === 'name') setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
                                                            else { setSortField('name'); setSortDirection('asc'); }
                                                        }}
                                                        className="flex items-center justify-center w-full gap-2 hover:text-blue-600 transition-colors whitespace-normal break-words text-center leading-tight"
                                                    >
                                                        <Package className="w-3.5 h-3.5 shrink-0" />
                                                        <span>Название</span>
                                                        {sortField === 'name' && (
                                                            sortDirection === 'asc' ? <ChevronDown className="w-3 h-3 shrink-0" /> : <ChevronDown className="w-3 h-3 rotate-180 shrink-0" />
                                                        )}
                                                    </button>
                                                </th>
                                                <th 
                                                    className="px-4 py-3 text-[11px] font-black text-gray-500 uppercase tracking-widest cursor-pointer hover:bg-gray-100 transition-colors w-32 align-middle text-center"
                                                    onClick={() => {
                                                        if (sortField === 'readyDate') setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
                                                        else { setSortField('readyDate'); setSortDirection('asc'); }
                                                    }}
                                                >
                                                    <div className="flex items-center justify-center gap-2 whitespace-normal break-words text-center leading-tight">
                                                        <Calendar className="w-3.5 h-3.5 shrink-0" />
                                                        <span>Готовность</span>
                                                        {sortField === 'readyDate' && (
                                                            sortDirection === 'asc' ? <ChevronDown className="w-3 h-3 shrink-0" /> : <ChevronDown className="w-3 h-3 rotate-180 shrink-0" />
                                                        )}
                                                    </div>
                                                </th>
                                                {CATEGORIES.map(cat => (
                                                    <th key={cat} className="px-3 py-3 text-[11px] font-black text-gray-500 uppercase tracking-widest min-w-[185px] w-[185px] align-middle text-center">
                                                        <div className="w-full whitespace-normal break-words leading-tight">{cat}</div>
                                                    </th>
                                                ))}
                                                <th className="px-4 py-3 text-[11px] font-black text-gray-500 uppercase tracking-widest w-40 text-center bg-blue-50/20 align-middle">
                                                    <div className="whitespace-normal break-words leading-tight">План / Расход</div>
                                                </th>
                                            </tr>
                                        </thead>
                                                        <tbody className="divide-y divide-gray-50 uppercase tracking-tight">
                                            {filteredOrders.length > 0 ? filteredOrders.map(order => {
                                                 let totalBudget = 0;
                                                 let totalActual = 0;
                                                 let categoriesInProject = 0;
                                                 let categoriesPurchased = 0;
                                                 let categoriesReceived = 0;
 
                                                 const rows = CATEGORIES.map(category => {
                                                     const data = order.procurementStatus?.[category] || { items: [], amount: 0 };
                                                     const budgetAmount = data.amount || 0;
                                                     
                                                     // Calculate stats for this category
                                                     const items = data.items || [];
                                                     const actualAmount = items.reduce((sum: number, i: any) => sum + (i.actualAmount || 0), 0);
                                                     
                                                     const isPurchased = items.length > 0 && items.some((i: any) => i.status === 'Заказано' || i.status === 'Поступило');
                                                     const isReceived = items.length > 0 && items.every((i: any) => i.status === 'Поступило');
                                                     const isPartialReceived = items.some((i: any) => i.status === 'Поступило' && (i.receivedQty || 0) < (i.qty || 0));
                                                     const isNotInProject = items.length > 0 && items.some((i: any) => i.status === 'Нет в проекте');
 
                                                     if (budgetAmount > 0 || items.length > 0) {
                                                         categoriesInProject++;
                                                         if (isReceived) {
                                                             categoriesPurchased++;
                                                             categoriesReceived++;
                                                         } else if (isPurchased) {
                                                             categoriesPurchased++;
                                                         }
                                                     }
 
                                                     totalBudget += budgetAmount;
                                                     totalActual += actualAmount;
 
                                                     return { category, data, budgetAmount, actualAmount, items, isPurchased, isReceived, isPartialReceived, isNotInProject };
                                                 });
 
                                                 const purchasePercent = categoriesInProject > 0 ? Math.round((categoriesPurchased / categoriesInProject) * 100) : 0;
                                                 const arrivalPercent = categoriesInProject > 0 ? Math.round((categoriesReceived / categoriesInProject) * 100) : 0;
 
                                                     return (
                                                     <tr key={order.id} className="hover:bg-blue-50/40 transition-colors group">
                                                          {/* Project Name Cell - Narrowed & Wrapping */}
                                                          <td className="px-4 py-3 sticky left-0 bg-white group-hover:bg-[#f8faff] z-10 border-r border-gray-100 shadow-[2px_0_5px_rgba(0,0,0,0.05)] transition-colors align-top w-48 font-black relative">
                                                              {Object.values(order.procurementStatus || {}).some((cat: any) => (cat.items || []).some((item: any) => item.status === 'Заказано' && item.isCredit)) && (
                                                                  <div className="absolute top-2 right-2 flex items-center justify-center w-6 h-6 rounded-lg bg-red-50 border border-red-200 text-red-600 shadow-sm z-20" title="Есть счет в долг">
                                                                      <HandCoins className="w-3.5 h-3.5" />
                                                                  </div>
                                                              )}
                                                              <div className="flex flex-col">
                                                                  <div className="flex items-center justify-between gap-2 mb-2">
                                                                     <span className="font-black text-gray-900 text-xs leading-[1.2] group-hover:text-blue-600 transition-colors break-words whitespace-normal flex-1">
                                                                         {order.name}
                                                                     </span>
                                                                  </div>
                                                                  <div className="flex items-center gap-3">
                                                                     <a 
                                                                         href={companyData.bitrix24?.webhookUrl ? `${companyData.bitrix24.webhookUrl.split('/rest/')[0]}/crm/deal/details/${order.b24DealId}/` : '#'} 
                                                                         target="_blank" 
                                                                         rel="noreferrer"
                                                                         className="flex items-center gap-1.5 px-3 py-1 bg-white border border-gray-100 text-gray-400 rounded-lg text-[9px] font-black uppercase hover:bg-blue-600 hover:text-white hover:border-blue-600 hover:shadow-lg hover:shadow-blue-200 transition-all"
                                                                     >
                                                                         B24
                                                                         <ExternalLink className="w-2.5 h-2.5" />
                                                                     </a>
                                                                  </div>
                                                                  
                                                                  <div className="mt-8 flex items-start justify-center gap-8 w-full">
                                                                      {/* Circle 1: Ordered */}
                                                                      <div className="flex flex-col items-center gap-2 min-w-0">
                                                                          <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
                                                                              <svg className="w-14 h-14 -rotate-90 scale-110">
                                                                                  <circle cx="28" cy="28" r="24" stroke="currentColor" strokeWidth="4.5" fill="transparent" className="text-gray-100" />
                                                                                  <circle cx="28" cy="28" r="24" stroke="currentColor" strokeWidth="4.5" fill="transparent" strokeDasharray={150.7} strokeDashoffset={150.7 - (purchasePercent/100)*150.7} strokeLinecap="round" className={cn("transition-all duration-700", purchasePercent === 100 ? "text-emerald-500" : purchasePercent > 40 ? "text-amber-500" : "text-rose-500")} />
                                                                              </svg>
                                                                              <span className="absolute text-[11px] font-black text-gray-900 tracking-tighter">{purchasePercent}%</span>
                                                                          </div>
                                                                          <div className="flex flex-col items-center">
                                                                              <span className="text-[9px] font-black text-gray-400 uppercase tracking-tight leading-none mb-1">Заказано</span>
                                                                              <span className="text-[9px] font-bold text-gray-500 leading-none">{categoriesPurchased}/{categoriesInProject}</span>
                                                                          </div>
                                                                      </div>
 
                                                                      {/* Circle 2: Received */}
                                                                      <div className="flex flex-col items-center gap-2 min-w-0">
                                                                          <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
                                                                              <svg className="w-14 h-14 -rotate-90 scale-110">
                                                                                  <circle cx="28" cy="28" r="24" stroke="currentColor" strokeWidth="4.5" fill="transparent" className="text-gray-100" />
                                                                                  <circle cx="28" cy="28" r="24" stroke="currentColor" strokeWidth="4.5" fill="transparent" strokeDasharray={150.7} strokeDashoffset={150.7 - (arrivalPercent/100)*150.7} strokeLinecap="round" className={cn("transition-all duration-700", arrivalPercent === 100 ? "text-emerald-500" : arrivalPercent > 40 ? "text-blue-500" : "text-gray-300")} />
                                                                              </svg>
                                                                              <span className="absolute text-[11px] font-black text-gray-900 tracking-tighter">{arrivalPercent}%</span>
                                                                          </div>
                                                                          <div className="flex flex-col items-center">
                                                                              <span className="text-[9px] font-black text-gray-400 uppercase tracking-tight leading-none mb-1">Поступило</span>
                                                                              <span className="text-[9px] font-bold text-gray-500 leading-none">{categoriesReceived}/{categoriesInProject}</span>
                                                                          </div>
                                                                      </div>
                                                                  </div>
                                                              </div>
                                                          </td>

                                                         {/* Ready Date Cell */}
                                                         <td className="px-4 py-3 align-top min-w-0">
                                                             {order.readyDate ? (() => {
                                                                 const targetDate = new Date(order.readyDate);
                                                                 targetDate.setHours(0,0,0,0);
                                                                 const today = new Date();
                                                                 today.setHours(0,0,0,0);
                                                                 const daysDifference = Math.round((targetDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
                                                                 
                                                                 let statusNode;
                                                                 
                                                                 if (daysDifference < 0) {
                                                                     statusNode = (
                                                                         <div className="flex flex-col items-center justify-center px-3 py-2 rounded-xl bg-rose-50 border border-rose-100 shadow-sm w-fit mt-1">
                                                                            <span className="text-[9px] font-black uppercase tracking-widest text-rose-500 mb-0.5">ПРОСРОЧКА</span>
                                                                            <span className="text-xl font-black text-rose-600 leading-none">{Math.abs(daysDifference)}<span className="text-[10px] ml-1 opacity-70">дн</span></span>
                                                                         </div>
                                                                     );
                                                                 } else if (daysDifference === 0) {
                                                                     statusNode = (
                                                                         <div className="flex flex-col items-center justify-center px-3 py-2 rounded-xl bg-amber-50 border border-amber-100 shadow-sm w-fit mt-1">
                                                                            <span className="text-[9px] font-black uppercase tracking-widest text-amber-500 mb-0.5">СЕГОДНЯ</span>
                                                                            <span className="text-xl font-black text-amber-600 leading-none">СДАЧА</span>
                                                                         </div>
                                                                     );
                                                                 } else if (daysDifference <= 7) {
                                                                     statusNode = (
                                                                         <div className="flex flex-col items-center justify-center px-3 py-2 rounded-xl bg-amber-50 border border-amber-100 shadow-sm w-fit mt-1">
                                                                            <span className="text-[9px] font-black uppercase tracking-widest text-amber-500 mb-0.5">ДО СДАЧИ</span>
                                                                            <span className="text-xl font-black text-amber-600 leading-none">{daysDifference}<span className="text-[10px] ml-1 opacity-70">дн</span></span>
                                                                         </div>
                                                                     );
                                                                 } else {
                                                                     statusNode = (
                                                                         <div className="flex flex-col items-center justify-center px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-100 shadow-sm w-fit mt-1">
                                                                            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500 mb-0.5">ДО СДАЧИ</span>
                                                                            <span className="text-xl font-black text-emerald-600 leading-none">{daysDifference}<span className="text-[10px] ml-1 opacity-70">дн</span></span>
                                                                         </div>
                                                                     );
                                                                 }

                                                                 return (
                                                                     <div className="flex flex-col gap-1.5">
                                                                         <div className="flex items-center gap-2 text-[10px] font-black px-3 py-1.5 rounded-xl border w-fit shadow-sm bg-white text-gray-700 border-gray-100">
                                                                             <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                                                             {formatDate(order.readyDate)}
                                                                         </div>
                                                                         {statusNode}
                                                                     </div>
                                                                 );
                                                             })() : (
                                                                 <div className="flex items-center gap-2 text-[10px] font-black px-3 py-1.5 rounded-xl border w-fit shadow-sm bg-gray-50 text-gray-300 border-transparent italic">
                                                                     —
                                                                 </div>
                                                             )}
                                                         </td>

                                                         {/* Procurement Status Cells */}
                                                         {rows.map(({ category, data, budgetAmount, actualAmount, items, isReceived, isPurchased, isPartialReceived, isNotInProject }) => {
                                                            const percent = budgetAmount > 0 ? Math.round((actualAmount / budgetAmount) * 100) : 0;
                                                            const isOverBudget = actualAmount > budgetAmount && actualAmount > 0;
                                                            const isFullyReceived = isReceived && actualAmount <= budgetAmount && actualAmount > 0;
                                                            
                                                            const mainStatus = data.status || 'Не заказано';
                                                            const config = STATUS_CONFIG[mainStatus as keyof typeof STATUS_CONFIG] || STATUS_CONFIG['Не заказано'];
                                                            
                                                            return (
                                                                <td key={category} className="px-4 py-4 align-top">
                                                                    <button 
                                                                        onClick={() => setEditingCell({order, category})}
                                                                        className={cn(
                                                                            "w-full text-left p-4 min-h-[130px] rounded-2xl border transition-all group/card relative overflow-hidden flex flex-col justify-between",
                                                                            isOverBudget 
                                                                                ? "bg-rose-50 border-rose-200" 
                                                                                : isFullyReceived
                                                                                    ? "bg-emerald-50 border-emerald-200"
                                                                                    : cn(config.bg, config.border, "hover:shadow-xl hover:shadow-blue-500/5 hover:bg-white transition-colors")
                                                                        )}
                                                                    >
                                                                        <div className="flex items-start justify-between min-w-0 mb-3 gap-1">
                                                                            <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                                                                                <div className={cn("text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 min-w-0", 
                                                                                    isOverBudget ? "text-rose-600" :
                                                                                    isFullyReceived ? "text-emerald-600" :
                                                                                    config.color
                                                                                )}>
                                                                                    <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", isOverBudget ? "bg-rose-500" : config.dot)} />
                                                                                    <span className="truncate" title={mainStatus}>{mainStatus} {items.length > 1 && <span className="opacity-50">({items.length})</span>}</span>
                                                                                </div>
                                                                                {(items.some((i: any) => i.hasProblem) || isPartialReceived) && (
                                                                                    <div className="flex items-center gap-1 bg-white border border-rose-100 text-rose-600 px-1.5 py-0.5 rounded shadow-sm text-[8px] font-black uppercase tracking-widest w-fit">
                                                                                        <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                                                                                        ВНИМАНИЕ
                                                                                    </div>
                                                                                )}
                                                                                {items.some((i: any) => i.status === 'Заказано' && i.isCredit) && (
                                                                                    <div className="flex items-center gap-1 bg-white border border-amber-200 text-amber-700 px-1.5 py-0.5 rounded shadow-sm text-[8px] font-black uppercase tracking-widest w-fit mt-1">
                                                                                        <Banknote className="w-2.5 h-2.5 shrink-0" />
                                                                                        В ДОЛГ
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                            <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-all shadow-sm shrink-0">
                                                                                <ChevronRight className="w-3 h-3 text-blue-500" />
                                                                            </div>
                                                                        </div>

                                                                        <div className="flex flex-col min-w-0">
                                                                            <div className={cn("font-mono text-lg font-black tracking-tighter leading-none mb-1 truncate",
                                                                                isOverBudget ? "text-rose-600" : "text-gray-900"
                                                                            )}>
                                                                                {Math.floor(actualAmount).toLocaleString()} <span className="text-gray-300 text-[10px] ml-0.5">₽</span>
                                                                            </div>
                                                                            <div className="text-[10px] font-medium text-gray-400 truncate">
                                                                                из {Math.floor(budgetAmount).toLocaleString()} ₽
                                                                            </div>
                                                                            
                                                                            <div className="h-4 mt-2">
                                                                                {items.length > 0 ? (
                                                                                    <div className="text-[9px] text-gray-400 font-bold flex items-center gap-1.5">
                                                                                        <div className="w-4 h-4 bg-white/50 rounded flex items-center justify-center border border-gray-100 shrink-0">
                                                                                            <Truck className="w-2.5 h-2.5" />
                                                                                        </div>
                                                                                        <span className="truncate">
                                                                                            {items.length === 1 
                                                                                                ? (suppliers.find(s => s.id === items[0].supplierId)?.name || '...') 
                                                                                                : `${items.length} поставщика`}
                                                                                        </span>
                                                                                    </div>
                                                                                ) : (
                                                                                     <div className="text-[9px] text-gray-300 font-bold italic">...</div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                        
                                                                        {/* Progress Bar background hint */}
                                                                        <div className={cn("absolute bottom-0 left-0 h-1 transition-all", 
                                                                            isOverBudget ? "bg-rose-400 w-full" :
                                                                            mainStatus === 'Заказано' ? "bg-amber-400 w-1/2" : 
                                                                            mainStatus === 'Поступило' ? "bg-emerald-400 w-full" :
                                                                            mainStatus === 'Нет в проекте' ? "bg-purple-400 w-full opacity-30" : "bg-gray-300 w-0"
                                                                        )} />
                                                                    </button>
                                                                </td>
                                                            );
                                                        })}

                                                        {/* Plan vs Actual Summary Cell */}
                                                        <td className="px-6 py-4 text-right bg-blue-50/20 align-top">
                                                             <div className="flex flex-col items-end gap-1">
                                                                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Дельта</div>
                                                                <div className={cn("text-xl font-black font-mono tracking-tighter", 
                                                                    (totalBudget - totalActual) < 0 ? "text-rose-600" : "text-emerald-600"
                                                                )}>
                                                                    {(totalBudget - totalActual).toLocaleString()} ₽
                                                                </div>
                                                                <div className="text-[9px] font-bold text-gray-400">
                                                                    План: {totalBudget.toLocaleString()}
                                                                </div>
                                                                <div className="text-[9px] font-bold text-gray-400">
                                                                    Факт: {totalActual.toLocaleString()}
                                                                </div>
                                                             </div>
                                                        </td>
                                                    </tr>
                                                );
                                            }) : (
                                            <tr>
                                                <td colSpan={CATEGORIES.length + 2} className="px-6 py-40 text-center bg-white">
                                                    <div className="flex flex-col items-center">
                                                        <div className="w-24 h-24 bg-gray-50 rounded-[3rem] flex items-center justify-center mb-8 rotate-3 hover:rotate-0 transition-transform shadow-inner">
                                                            <Package className="w-10 h-10 text-gray-200" />
                                                        </div>
                                                        <h3 className="text-2xl font-black text-gray-900 tracking-tight">Заказы не синхронизированы</h3>
                                                        <p className="text-gray-400 text-sm mt-3 max-w-xs mx-auto font-medium">
                                                            Убедитесь, что сделки в Bitrix24 находятся на стадии снабжения и нажмите кнопку загрузки.
                                                        </p>
                                                        <button 
                                                            onClick={syncDeals}
                                                            className="mt-10 bg-blue-600 text-white px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 active:scale-95"
                                                        >
                                                            Синхронизировать сейчас
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Precision Edit Modal */}
            <AnimatePresence>
                {editingCell && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 sm:p-12">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-gray-900/60 backdrop-blur-md"
                            onClick={() => setEditingCell(null)}
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 30 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 30 }}
                            className="relative bg-white w-full max-w-xl rounded-[3rem] shadow-2xl shadow-black/20 overflow-hidden border border-white/20"
                        >
                            {/* Modal Header */}
                            <div className="relative h-32 bg-gray-900 flex items-end px-10 pb-6">
                                <div className="absolute top-6 right-6 z-[250]">
                                    <button 
                                        onClick={() => setEditingCell(null)}
                                        className="w-10 h-10 bg-white/10 hover:bg-white text-white hover:text-gray-900 rounded-2xl flex items-center justify-center transition-all backdrop-blur-md shadow-lg"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                                <div className="z-10">
                                    <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1.5">{editingCell.category}</div>
                                    <h2 className="text-2xl font-black text-white tracking-tight leading-none truncate max-w-md">
                                        {editingCell.order.name}
                                    </h2>
                                </div>
                                {/* Header Decorative Elements */}
                                <div className="absolute -bottom-8 -right-8 w-40 h-40 bg-blue-600 rounded-full blur-[80px] opacity-20" />
                            </div>
                            
                            <div className="p-10 max-h-[70vh] overflow-y-auto overflow-x-hidden">
                                {editingItemIndex === null ? (
                                   <div className="space-y-6">
                                       <div className="flex items-center justify-between">
                                           <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Список счетов / оплат</h3>
                                           <button 
                                               onClick={() => {
                                                   setEditingItemIndex(-1); // Special value for new item
                                                   setEditStatus('Не заказано');
                                                   setEditAmount('');
                                                   setEditSupplierId('');
                                                   setEditInvoice('');
                                                   setEditArrivalDate('');
                                               }}
                                               className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
                                           >
                                               <Plus className="w-3 h-3" />
                                               Добавить счет
                                           </button>
                                       </div>

                                       {categoryItems.length === 0 ? (
                                           <div className="bg-gray-50 rounded-3xl p-10 flex flex-col items-center text-center">
                                               <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-sm">
                                                   <FileText className="w-8 h-8 text-gray-200" />
                                               </div>
                                               <p className="text-gray-400 text-xs font-bold uppercase tracking-tight">Счета пока не добавлены</p>
                                           </div>
                                       ) : (
                                           <div className="space-y-3">
                                               {categoryItems.map((item, idx) => {
                                                   const supplier = suppliers.find(s => s.id === item.supplierId);
                                                   const config = STATUS_CONFIG[item.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG['Не заказано'];
                                                   
                                                   return (
                                                       <div 
                                                           key={item.id}
                                                           className="bg-white border-2 border-gray-50 rounded-[2rem] p-5 flex flex-col gap-4 group hover:border-blue-100 transition-all"
                                                       >
                                                           <div className="flex items-start justify-between min-w-0">
                                                               <div className="flex items-center gap-4 min-w-0">
                                                               <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shrink-0", config.bg)}>
                                                                   <config.icon className={cn("w-6 h-6", config.color)} />
                                                               </div>
                                                               <div className="text-left min-w-0 w-full">
                                                                   <div className="flex items-center gap-2 mb-1">
                                                                       <span className="text-[11px] font-black text-gray-900 truncate">{item.invoiceNumber || "Без номера"}</span>
                                                                       <span className={cn("text-[8px] font-black px-2 py-0.5 rounded-full border shrink-0", config.bg, config.color, config.border)}>
                                                                           {item.status}
                                                                       </span>
                                                                   </div>
                                                                   <div className="flex flex-wrap items-center gap-y-1 gap-x-3">
                                                                       <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1 min-w-0">
                                                                           <Truck className="w-3 h-3 shrink-0" />
                                                                           <span className="truncate">{supplier?.name || "Поставщик не указан"}</span>
                                                                       </span>
                                                                       {item.arrivalDate && (
                                                                           <span className="text-[10px] font-bold text-blue-400 flex items-center gap-1 shrink-0">
                                                                               <Calendar className="w-3 h-3" />
                                                                               {item.arrivalDate.split('-').reverse().join('.')}
                                                                           </span>
                                                                       )}
                                                                   </div>
                                                               </div>
                                                               </div>
                                                           <div className="flex items-center gap-3 shrink-0">
                                                               <div className="text-right hidden sm:block mr-2">
                                                                   <div className="text-sm font-black text-gray-900 leading-none mb-1">
                                                                       {item.actualAmount.toLocaleString()} ₽
                                                                   </div>
                                                                   <div className="text-[8px] font-black text-gray-400 uppercase leading-none">Сумма счета</div>
                                                               </div>
                                                               <button 
                                                                   onClick={() => {
                                                                       setEditingItemIndex(idx);
                                                                       setEditStatus(item.status);
                                                                       setEditAmount(String(item.actualAmount || ''));
                                                                       setEditSupplierId(item.supplierId || '');
                                                                       setEditInvoice(item.invoiceNumber || '');
                                                                       setEditArrivalDate(item.arrivalDate || '');
                                                                       setEditIsCredit(item.isCredit || false);
                                                                   }}
                                                                   className="w-10 h-10 bg-gray-50 text-gray-400 hover:bg-blue-600 hover:text-white rounded-xl flex items-center justify-center transition-all lg:opacity-0 lg:group-hover:opacity-100"
                                                               >
                                                                   <Edit2 className="w-4 h-4" />
                                                               </button>
                                                               <button 
                                                                   onClick={async () => {
                                                                       const newItems = categoryItems.filter((_, i) => i !== idx);
                                                                       await updateDoc(doc(db, 'companies', companyData.id, 'projectSets', editingCell.order.id), {
                                                                           [`procurementStatus.${editingCell.category}.items`]: newItems,
                                                                           [`procurementStatus.${editingCell.category}.actualAmount`]: newItems.reduce((sum: number, i: any) => sum + (i.actualAmount || 0), 0)
                                                                       });
                                                                       setCategoryItems(newItems);
                                                                   }}
                                                                   className="w-10 h-10 bg-rose-50 text-rose-400 hover:bg-rose-600 hover:text-white rounded-xl flex items-center justify-center transition-all lg:opacity-0 lg:group-hover:opacity-100"
                                                               >
                                                                   <Trash2 className="w-4 h-4" />
                                                               </button>
                                                           </div>
                                                           </div>
                                                            {item.warehouseComment && (
                                                                <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 flex items-start gap-2.5 ml-0 sm:ml-16">
                                                                    <MessageSquare className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                                                                    <div className="flex flex-col gap-0.5 flex-1">
                                                                        <span className="text-[10px] font-black uppercase tracking-widest text-rose-600">Комментарий склада</span>
                                                                        <span className="text-xs text-rose-700">{item.warehouseComment}</span>
                                                                    </div>
                                                                    {(item.hasProblem || (item.status === 'Поступило' && (item.receivedQty || 0) < (item.qty || 0))) && !item.warehouseCommentRead && (
                                                                        <button 
                                                                            onClick={async () => {
                                                                                const newItems = [...categoryItems];
                                                                                newItems[idx] = { ...newItems[idx], warehouseCommentRead: true };
                                                                                
                                                                                // Оптимистичное обновление
                                                                                setCategoryItems(newItems);
                                                                                setOrders(prev => prev.map(o => {
                                                                                    if (o.id === editingCell.order.id) {
                                                                                        return {
                                                                                            ...o,
                                                                                            procurementStatus: {
                                                                                                ...(o.procurementStatus || {}),
                                                                                                [editingCell.category]: {
                                                                                                    ...(o.procurementStatus?.[editingCell.category] || {}),
                                                                                                    items: newItems
                                                                                                }
                                                                                            }
                                                                                        };
                                                                                    }
                                                                                    return o;
                                                                                }));
                                                                                
                                                                                await updateDoc(doc(db, 'companies', companyData.id, 'projectSets', editingCell.order.id), {
                                                                                    [`procurementStatus.${editingCell.category}.items`]: newItems
                                                                                });
                                                                            }}
                                                                            className="px-3 py-1.5 bg-rose-600 text-white hover:bg-rose-700 rounded-lg text-[10px] font-bold tracking-widest uppercase transition-colors shrink-0 flex items-center gap-1.5 shadow-sm hover:shadow"
                                                                        >
                                                                            <Check className="w-3 h-3" />
                                                                            Ознакомлен
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            )}
                                                       </div>
                                                   );
                                               })}
                                           </div>
                                       )}

                                       <div className="pt-6 border-t border-gray-50 flex justify-between items-center text-[10px] font-black uppercase text-gray-400 tracking-widest">
                                           <span>Общий бюджет категории:</span>
                                           <span className="text-gray-900">{(editingCell.order.procurementStatus?.[editingCell.category]?.amount || 0).toLocaleString()} ₽</span>
                                       </div>
                                  </div>
                                ) : (
                                  <div className="space-y-8">
                                       <div className="flex items-center gap-4 mb-4">
                                           <button 
                                               onClick={() => setEditingItemIndex(null)}
                                               className="w-10 h-10 bg-gray-50 text-gray-400 hover:text-gray-900 rounded-xl flex items-center justify-center transition-all"
                                           >
                                               <ChevronRight className="w-5 h-5 rotate-180" />
                                           </button>
                                           <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest font-sans">
                                               {editingItemIndex === -1 ? 'Новый счет' : 'Редактировать счет'}
                                           </h3>
                                       </div>

                                       <div className="grid grid-cols-1 gap-8">
                                           {/* Status Selector */}
                                           <div className="text-left">
                                               <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block ml-2">Статус</label>
                                               <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                                   {Object.keys(STATUS_CONFIG).map(s => {
                                                       const isActive = editStatus === s;
                                                       const config = STATUS_CONFIG[s as keyof typeof STATUS_CONFIG];
                                                       const Icon = config.icon;
                                                       
                                                       return (
                                                           <button
                                                               key={s}
                                                               type="button"
                                                               onClick={() => setEditStatus(s)}
                                                               className={cn(
                                                                   "flex flex-col items-center gap-3 p-4 rounded-[2rem] border-2 transition-all relative overflow-hidden group",
                                                                   isActive 
                                                                       ? cn(config.bg, config.border, config.color, "shadow-lg scale-[1.02]") 
                                                                       : "bg-gray-50 border-gray-50 text-gray-400 hover:border-gray-200 hover:bg-white"
                                                               )}
                                                           >
                                                               <Icon className={cn("w-5 h-5", isActive ? config.color : "text-gray-300 group-hover:text-blue-400")} />
                                                               <span className="text-[9px] font-black uppercase tracking-tight text-center leading-none">{s}</span>
                                                           </button>
                                                       );
                                                   })}
                                               </div>
                                           </div>

                                           {/* Form Fields */}
                                           <div className="space-y-5">
                                               <div className="grid grid-cols-1 md:grid-cols-2 gap-5 font-sans text-left">
                                                   <div className="col-span-2">
                                                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block ml-2">Поставщик</label>
                                                       <select 
                                                           value={editSupplierId}
                                                           onChange={(e) => setEditSupplierId(e.target.value)}
                                                           className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-blue-200 focus:bg-white rounded-3xl text-sm font-bold outline-none appearance-none transition-all cursor-pointer"
                                                       >
                                                           <option value="">Не выбран</option>
                                                           {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                                       </select>
                                                   </div>

                                                   <div>
                                                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block ml-2">Номер счета</label>
                                                       <input 
                                                           type="text"
                                                           placeholder="№ счета"
                                                           value={editInvoice}
                                                           onChange={(e) => setEditInvoice(e.target.value)}
                                                           className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-blue-200 focus:bg-white rounded-3xl text-sm font-bold outline-none transition-all"
                                                       />
                                                   </div>

                                                   <div>
                                                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block ml-2">Дата прихода</label>
                                                       <input 
                                                           type="date"
                                                           value={editArrivalDate}
                                                           onChange={(e) => setEditArrivalDate(e.target.value)}
                                                           className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-blue-200 focus:bg-white rounded-3xl text-sm font-bold outline-none transition-all"
                                                       />
                                                   </div>

                                                   <div className="col-span-2">
                                                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block ml-2">Сумма фактически</label>
                                                       <div className="relative group">
                                                           <CreditCard className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-focus-within:text-blue-500" />
                                                           <input 
                                                               type="number"
                                                               placeholder="Введите сумму"
                                                               value={editAmount}
                                                               onChange={(e) => setEditAmount(e.target.value)}
                                                               className="w-full pl-14 pr-6 py-4 bg-gray-50 border-2 border-transparent focus:border-blue-200 focus:bg-white rounded-3xl text-sm font-bold outline-none transition-all"
                                                           />
                                                           <div className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-300 font-bold text-xs uppercase">RUB</div>
                                                       </div>
                                                   </div>
                                               </div>

                                               {editStatus === 'Заказано' && (
                                                   <label className="flex items-center gap-3 cursor-pointer p-4 border-2 border-amber-100 rounded-2xl hover:border-amber-300 transition-colors bg-amber-50 mt-4 mb-4 col-span-2">
                                                       <input 
                                                           type="checkbox" 
                                                           checked={editIsCredit} 
                                                           onChange={(e) => setEditIsCredit(e.target.checked)}
                                                           className="w-5 h-5 text-amber-600 rounded border-2 border-amber-200 focus:ring-amber-500 focus:ring-2 bg-white shrink-0"
                                                       />
                                                       <div className="flex flex-col">
                                                           <span className="text-sm font-bold text-amber-900">Везут в долг</span>
                                                           <span className="text-[10px] uppercase font-bold text-amber-700/70 tracking-widest mt-0.5">Оплата будет позже</span>
                                                       </div>
                                                   </label>
                                               )}
                                           </div>

                                           <div className="flex gap-4">
                                               <button 
                                                   onClick={() => setEditingItemIndex(null)}
                                                   className="flex-1 py-4 bg-gray-50 text-gray-400 rounded-3xl font-black text-xs uppercase tracking-widest hover:bg-gray-100 transition-all"
                                               >
                                                   Отмена
                                               </button>
                                               <button 
                                                   onClick={handleUpdateStatus}
                                                   className="flex-[2] py-4 bg-blue-600 text-white rounded-3xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 active:scale-95"
                                               >
                                                   Сохранить
                                               </button>
                                           </div>
                                       </div>
                                  </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showProblemsModal && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-gray-900/60 backdrop-blur-md"
                            onClick={() => setShowProblemsModal(false)}
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white rounded-3xl shadow-2xl relative w-full max-w-4xl overflow-hidden flex flex-col"
                            style={{ maxHeight: 'calc(100vh - 4rem)' }}
                        >
                            <div className="p-6 border-b flex items-center justify-between bg-gray-50">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center">
                                        <AlertTriangle className="w-5 h-5 text-rose-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-gray-900">Ошибки склада</h3>
                                        <p className="text-xs text-gray-500 font-medium">Требуется проверка</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setShowProblemsModal(false)}
                                    className="w-8 h-8 flex items-center justify-center bg-gray-200 hover:bg-gray-300 text-gray-600 rounded-full transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            
                            <div className="flex-1 overflow-auto p-6 bg-white space-y-4">
                                {allArrivalProblems.length === 0 ? (
                                    <div className="text-center py-10 text-gray-400 font-medium">
                                        Активных проблем или событий не зафиксировано.
                                    </div>
                                ) : (
                                    allArrivalProblems.map((prob, idx) => {
                                        const { order, category, item, itemIndex } = prob;
                                        const isRead = item.warehouseCommentRead;
                                        
                                        return (
                                            <div 
                                                key={idx} 
                                                className={cn(
                                                    "border rounded-2xl p-4 flex flex-col gap-3 transition-all",
                                                    isRead 
                                                        ? "border-emerald-100 bg-emerald-50/25" 
                                                        : "border-rose-100 bg-rose-50 shadow-sm"
                                                )}
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <div className={cn("text-[10px] font-black uppercase tracking-widest", isRead ? "text-emerald-600" : "text-rose-600")}>Сделка</div>
                                                        <div className="font-bold text-gray-900 text-sm">{order.name}</div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-[10px] font-black uppercase tracking-widest text-gray-500">Категория</div>
                                                        <div className="font-bold text-gray-700 text-sm">{category}</div>
                                                    </div>
                                                </div>
                                                
                                                <div className={cn(
                                                    "flex flex-col gap-1 bg-white p-3 rounded-xl border",
                                                    isRead ? "border-emerald-100" : "border-rose-100"
                                                )}>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Поставщик</span>
                                                        <span className="font-bold text-gray-700 text-xs">{suppliers.find(s => s.id === item.supplierId)?.name || 'Не выбран'}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-xs">
                                                        <span className="text-gray-500">Статус прихода:</span>
                                                        <span className={cn("font-bold", isRead ? "text-emerald-600" : "text-rose-600")}>
                                                            {item.hasProblem ? 'Проблема на складе' : `Сдано ${item.receivedQty || 0} из ${item.qty || 0}`}
                                                        </span>
                                                    </div>
                                                    {item.warehouseComment && (
                                                        <div className={cn(
                                                            "mt-2 border rounded-lg p-2.5 flex items-start gap-2",
                                                            isRead ? "bg-emerald-50/50 border-emerald-100" : "bg-rose-50 border-rose-100"
                                                        )}>
                                                            <MessageSquare className={cn("w-4 h-4 shrink-0 mt-0.5", isRead ? "text-emerald-500" : "text-rose-500")} />
                                                            <div className="flex flex-col">
                                                                <span className={cn("text-[10px] font-bold uppercase tracking-widest", isRead ? "text-emerald-600/70" : "text-rose-600/70")}>Комментарий</span>
                                                                <span className={cn("text-xs font-medium", isRead ? "text-emerald-950" : "text-rose-950")}>{item.warehouseComment}</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
 
                                                <div className="flex justify-end mt-1">
                                                    {isRead ? (
                                                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100/50 text-emerald-800 rounded-xl text-xs font-black tracking-wide uppercase leading-none select-none">
                                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                                            Проверено
                                                        </div>
                                                    ) : (
                                                        <button 
                                                            onClick={() => {
                                                                const newProcurementStatus = { ...order.procurementStatus };
                                                                const newItems = [...(newProcurementStatus[category]?.items || [])];
                                                                if (newItems[itemIndex]) {
                                                                    newItems[itemIndex] = { ...newItems[itemIndex], warehouseCommentRead: true };
                                                                    newProcurementStatus[category].items = newItems;
                                                                    
                                                                    // Оптимистичное обновление
                                                                    setOrders(prev => prev.map(o => {
                                                                        if (o.id === order.id) {
                                                                            return { ...o, procurementStatus: newProcurementStatus };
                                                                        }
                                                                        return o;
                                                                    }));
 
                                                                    // Не блокируем UI через await, убирая микрозадержку сохранения в бэкграунд!
                                                                    updateDoc(doc(db, 'companies', companyData.id, 'projectSets', order.id), {
                                                                        procurementStatus: newProcurementStatus
                                                                    });
                                                                }
                                                            }}
                                                            className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-xl text-xs font-bold tracking-widest uppercase transition-colors flex items-center gap-2 shadow-lg shadow-blue-100 hover:scale-[1.02] active:scale-95 duration-100"
                                                        >
                                                            <Check className="w-3.5 h-3.5" />
                                                            Ознакомлен
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

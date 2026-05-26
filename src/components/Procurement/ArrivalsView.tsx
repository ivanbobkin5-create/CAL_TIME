import React, { useState, useMemo } from 'react';
import { 
    Truck, 
    Calendar, 
    Search, 
    Filter,
    ChevronRight,
    Package,
    Building2,
    Clock,
    CheckCircle2,
    LayoutDashboard,
    AlertTriangle
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export const ArrivalsView = ({ 
    orders, 
    suppliers,
    db,
    doc,
    getDoc,
    updateDoc,
    companyData
}: { 
    orders: any[], 
    suppliers: any[],
    db: any,
    doc: any,
    getDoc: any,
    updateDoc: any,
    companyData: any
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'tomorrow' | 'week'>('all');
    const [supplierFilter, setSupplierFilter] = useState<string>('all');
    const [isProcessing, setIsProcessing] = useState<string | null>(null);
    const [commentData, setCommentData] = useState<Record<string, string>>({});
    const [problemData, setProblemData] = useState<Record<string, boolean>>({});
    const [expandedArrival, setExpandedArrival] = useState<string | null>(null);
    const [acceptedArrivalIds, setAcceptedArrivalIds] = useState<Set<string>>(new Set());

    const arrivals = useMemo(() => {
        const result: any[] = [];
        
        orders.forEach(order => {
            if (!order.procurementStatus) return;
            
            Object.keys(order.procurementStatus).forEach(category => {
                const catData = order.procurementStatus[category];
                const items = catData.items || [];
                
                items.forEach((item: any) => {
                    if (item.arrivalDate && item.status === 'Заказано' && !acceptedArrivalIds.has(item.id)) {
                        result.push({
                            ...item,
                            projectName: order.name,
                            category,
                            projectId: order.id,
                            b24DealId: order.b24DealId
                        });
                    }
                });
            });
        });
        
        return result.sort((a, b) => new Date(a.arrivalDate).getTime() - new Date(b.arrivalDate).getTime());
    }, [orders]);

    const filteredArrivals = useMemo(() => {
        return arrivals.filter(arr => {
            const matchesSearch = arr.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                arr.invoiceNumber?.toLowerCase().includes(searchQuery.toLowerCase());
            
            const matchesSupplier = supplierFilter === 'all' || arr.supplierId === supplierFilter;
            
            const arrDate = new Date(arr.arrivalDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const tomorrow = new Date(today);
            tomorrow.setDate(today.getDate() + 1);
            
            const nextWeek = new Date(today);
            nextWeek.setDate(today.getDate() + 7);
            
            let matchesDate = true;
            if (dateFilter === 'today') {
                matchesDate = arrDate.getTime() >= today.getTime() && arrDate.getTime() < tomorrow.getTime();
            } else if (dateFilter === 'tomorrow') {
                matchesDate = arrDate.getTime() >= tomorrow.getTime() && arrDate.getTime() < (tomorrow.getTime() + 86400000);
            } else if (dateFilter === 'week') {
                matchesDate = arrDate.getTime() >= today.getTime() && arrDate.getTime() <= nextWeek.getTime();
            }
            
            return matchesSearch && matchesSupplier && matchesDate;
        });
    }, [arrivals, searchQuery, supplierFilter, dateFilter]);

    const getSupplierName = (id: string) => {
        return suppliers.find(s => s.id === id)?.name || 'Неизвестный поставщик';
    };

    const handleReceived = async (arr: any) => {
        if (!companyData?.id || !arr.projectId) return;
        
        // Optimistically remove from UI
        setAcceptedArrivalIds(prev => {
            const next = new Set(prev);
            next.add(arr.id);
            return next;
        });

        setIsProcessing(arr.id);
        const comment = commentData[arr.id] || "";

        try {
            const projectRef = doc(db, 'companies', companyData.id, 'projectSets', arr.projectId);
            const orderDoc = await getDoc(projectRef);
            if (!orderDoc.exists()) {
                console.error("Project document not found:", arr.projectId);
                return;
            }
            
            const order = { id: orderDoc.id, ...orderDoc.data() };
            if (!order.procurementStatus) return;

            const currentStatus = order.procurementStatus || {};
            const categoryData = { ...currentStatus[arr.category] };
            const items = [...(categoryData.items || [])];
            const itemIndex = items.findIndex((i: any) => i.id === arr.id);

            if (itemIndex !== -1) {
                items[itemIndex] = {
                    ...items[itemIndex],
                    status: 'Поступило',
                    warehouseComment: comment,
                    receivedAt: new Date().toISOString(),
                    hasProblem: problemData[arr.id] || false
                };

                // Recalculate category status
                const hasOrdered = items.some((i: any) => i.status === 'Заказано');
                const hasReceived = items.every((i: any) => i.status === 'Поступило');
                
                let primaryStatus = categoryData.status;
                if (hasReceived) primaryStatus = 'Поступило';
                else if (hasOrdered) primaryStatus = 'Заказано';

                categoryData.items = items;
                categoryData.status = primaryStatus;
                categoryData.updatedAt = new Date().toISOString();

                const updatedProcStatus = {
                    ...currentStatus,
                    [arr.category]: categoryData
                };

                await updateDoc(doc(db, 'companies', companyData.id, 'projectSets', arr.projectId), {
                    procurementStatus: updatedProcStatus
                });
            }
        } catch (error) {
            console.error("Arrival update error:", error);
        } finally {
            setIsProcessing(null);
        }
    };

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (d.getTime() === today.getTime()) return 'Сегодня';
        if (d.getTime() === today.getTime() + 86400000) return 'Завтра';
        
        return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
    };

    return (
        <div className="flex flex-col h-full bg-[#FAFBFC] font-sans">
            {/* Top Navigation */}
            <div className="bg-white border-b border-gray-100 px-8 py-4 sticky top-0 z-30">
                <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-200">
                            <Truck className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-gray-900 tracking-tight leading-none">Приходы</h1>
                            <p className="text-[10px] font-black uppercase text-amber-600 mt-1.5 flex items-center gap-1.5">
                                <Clock className="w-2.5 h-2.5" />
                                Ожидается поступлений: {filteredArrivals.length}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-amber-500 transition-colors" />
                            <input 
                                type="text"
                                placeholder="Поиск по проекту или счету..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 pr-4 py-2.5 bg-gray-50 border border-transparent focus:border-amber-200 focus:bg-white rounded-2xl text-sm font-bold outline-none w-64 transition-all shadow-inner"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="bg-white border-b border-gray-100 px-8 py-3 z-20">
                <div className="max-w-[1600px] mx-auto flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Период:</span>
                        <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-100">
                            {[
                                { id: 'all', label: 'Все' },
                                { id: 'today', label: 'Сегодня' },
                                { id: 'tomorrow', label: 'Завтра' },
                                { id: 'week', label: 'Неделя' }
                            ].map(f => (
                                <button
                                    key={f.id}
                                    onClick={() => setDateFilter(f.id as any)}
                                    className={cn(
                                        "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                                        dateFilter === f.id ? "bg-white text-amber-600 shadow-sm" : "text-gray-400 hover:text-gray-600"
                                    )}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Поставщик:</span>
                        <select
                            value={supplierFilter}
                            onChange={(e) => setSupplierFilter(e.target.value)}
                            className="bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider text-gray-600 outline-none focus:border-amber-200"
                        >
                            <option value="all">Все поставщики</option>
                            {suppliers.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Arrivals Feed */}
            <div className="p-8 flex-1 overflow-auto">
                <div className="max-w-[1600px] mx-auto">
                    {filteredArrivals.length === 0 ? (
                        <div className="bg-white p-12 rounded-[2.5rem] border-2 border-dashed border-gray-100 flex flex-col items-center text-center">
                            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                                <Package className="w-10 h-10 text-gray-200" />
                            </div>
                            <h2 className="text-2xl font-black text-gray-900">Приходов не найдено</h2>
                            <p className="text-gray-500 mt-2 max-w-sm font-medium">В выбранном периоде нет ожидаемых поступлений материалов.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            <AnimatePresence mode="popLayout">
                                {filteredArrivals.map((arr, idx) => (
                                    <motion.div
                                        key={`${arr.id}-${idx}`}
                                        layout
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className="bg-white rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-amber-500/5 transition-all p-6 group"
                                    >
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest bg-amber-50 px-2 py-0.5 rounded-full w-fit mb-2">
                                                    {arr.category}
                                                </span>
                                                <h3 className="font-black text-gray-900 group-hover:text-amber-600 transition-colors leading-tight">
                                                    {arr.projectName}
                                                </h3>
                                            </div>
                                            <div className="p-3 bg-gray-50 rounded-2xl group-hover:bg-amber-500 transition-colors group-hover:text-white text-gray-400">
                                                <Truck className="w-5 h-5" />
                                            </div>
                                        </div>

                                        <div className={cn(
                                            "space-y-3 mb-6 transition-all duration-300",
                                            expandedArrival === arr.id ? "opacity-100 max-h-[500px]" : "opacity-100 max-h-[120px] overflow-hidden"
                                        )}>
                                            <div className="flex items-center gap-3">
                                                <Building2 className="w-4 h-4 text-gray-300 shrink-0" />
                                                <div className="text-xs min-w-0">
                                                    <div className="text-gray-400 font-bold uppercase text-[9px] tracking-wider">Поставщик</div>
                                                    <div className="text-gray-700 font-bold truncate">{getSupplierName(arr.supplierId)}</div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <Calendar className="w-4 h-4 text-gray-300 shrink-0" />
                                                <div className="text-xs">
                                                    <div className="text-gray-400 font-bold uppercase text-[9px] tracking-wider">Дата прихода</div>
                                                    <div className="text-gray-900 font-black">{formatDate(arr.arrivalDate)}</div>
                                                </div>
                                            </div>
                                            {arr.invoiceNumber && (
                                                <div className="flex items-center gap-3">
                                                    <div className="w-4 h-4 flex items-center justify-center text-[10px] font-black text-gray-300 shrink-0">№</div>
                                                    <div className="text-xs">
                                                        <div className="text-gray-400 font-bold uppercase text-[9px] tracking-wider">Счет</div>
                                                        <div className="text-gray-700 font-bold truncate">{arr.invoiceNumber}</div>
                                                    </div>
                                                </div>
                                            )}

                                            {expandedArrival === arr.id && (
                                                <motion.div 
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className="pt-4 border-t border-gray-50 flex flex-col gap-3"
                                                >
                                                    <textarea 
                                                        placeholder="Комментарий для склада (недостача, брак и т.д.)"
                                                        value={commentData[arr.id] || ""}
                                                        onChange={(e) => setCommentData(prev => ({...prev, [arr.id]: e.target.value}))}
                                                        className="w-full p-3 bg-gray-50 border border-transparent focus:border-amber-200 focus:bg-white rounded-xl text-[11px] font-medium outline-none min-h-[80px] transition-all resize-none"
                                                    />
                                                    <label className="flex items-center gap-2 cursor-pointer group">
                                                        <input 
                                                            type="checkbox" 
                                                            className="w-4 h-4 rounded border-gray-300 text-rose-500 focus:ring-rose-500"
                                                            checked={problemData[arr.id] || false}
                                                            onChange={(e) => setProblemData(prev => ({...prev, [arr.id]: e.target.checked}))}
                                                        />
                                                        <span className="text-[11px] font-semibold text-gray-700 group-hover:text-rose-600 transition-colors">Есть расхождения по счету (отметит счет маркером "Внимание")</span>
                                                    </label>
                                                    <button
                                                        onClick={() => handleReceived(arr)}
                                                        disabled={isProcessing === arr.id}
                                                        className={cn(
                                                            "w-full py-3 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95",
                                                            isProcessing === arr.id 
                                                                ? "bg-gray-100 text-gray-400 cursor-not-allowed" 
                                                                : "bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-emerald-200"
                                                        )}
                                                    >
                                                        {isProcessing === arr.id ? (
                                                            <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-current"></div>
                                                        ) : (
                                                            <>
                                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                                Принять на склад
                                                            </>
                                                        )}
                                                    </button>
                                                </motion.div>
                                            )}
                                        </div>

                                        <div className="pt-4 border-t border-gray-50 flex items-center justify-between mt-auto">
                                            <div className="text-xs font-black text-gray-400">
                                                {arr.actualAmount ? `${Math.floor(arr.actualAmount).toLocaleString()} ₽` : 'Цена не указана'}
                                            </div>
                                            <button 
                                                onClick={() => setExpandedArrival(expandedArrival === arr.id ? null : arr.id)}
                                                className={cn(
                                                    "flex items-center gap-2 p-2 rounded-xl transition-all font-black uppercase text-[10px]",
                                                    expandedArrival === arr.id 
                                                        ? "bg-amber-50 text-amber-600" 
                                                        : "hover:bg-gray-50 text-gray-400 hover:text-amber-600"
                                                )}
                                            >
                                                {expandedArrival === arr.id ? 'Скрыть' : 'Детали'}
                                                <ChevronRight className={cn("w-4 h-4 transition-transform", expandedArrival === arr.id && "rotate-90")} />
                                            </button>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

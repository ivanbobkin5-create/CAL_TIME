import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    AreaChart, Area, PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts';
import { 
    Calendar, TrendingUp, ShoppingCart, CheckCircle2, 
    Clock, AlertCircle, FileText, MessageSquare, 
    ArrowUpRight, ArrowDownRight, Package, RussianRuble,
    Filter, Download, ChevronRight, Search
} from 'lucide-react';
import { cn } from '../../lib/utils';

const CATEGORIES = [
    'ЛДСП / МДФ (распил)',
    'ХДФ / Задние стенки',
    'Кромка',
    'Фасады (м²)',
    'Фасады (шт)',
    'Фурнитура',
    'Ящики (системы)',
    'Петли',
    'Ручки',
    'Столешница / Стеновая',
    'Профили / Освещение',
    'Наполнение (корзины / сушки)',
    'Бытовая техника / Мойки',
    'Прочее'
];

interface ProcurementPlanViewProps {
    orders: any[];
    companyData: any;
}

export const ProcurementPlanView: React.FC<ProcurementPlanViewProps> = ({ orders, companyData }) => {
    // 1. Process data for overall statistics
    const stats = useMemo(() => {
        let totalBudget = 0;
        let totalActual = 0;
        let billsCount = 0;
        let categoriesInProject = 0;
        let categoriesCompleted = 0;
        const categoriesInProgress = 0;
        let categoriesReceived = 0;
        
        orders.forEach(order => {
            Object.entries(order.procurementStatus || {}).forEach(([cat, data]: [string, any]) => {
                const amount = data.amount || 0;
                const items = data.items || [];
                
                if (amount > 0 || items.length > 0) {
                    totalBudget += amount;
                    categoriesInProject++;
                    
                    const isReceived = items.length > 0 && items.every((i: any) => i.status === 'Поступило');
                    const isPurchased = items.length > 0 && items.some((i: any) => i.status === 'Заказано' || i.status === 'Поступило');
                    
                    if (isReceived) {
                        categoriesReceived++;
                    }
                    
                    items.forEach((item: any) => {
                        if (item.billUrl) billsCount++;
                        if (item.status === 'Поступило') {
                            totalActual += ((item.receivedQty || item.qty || 0) * (item.price || 0));
                        }
                    });
                }
            });
        });
        
        return {
            totalBudget,
            totalActual,
            billsCount,
            categoriesInProject,
            categoriesReceived,
            utilization: totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0
        };
    }, [orders]);

    // 2. Category Performance (Planned vs Actual per Category)
    const categoryPerformance = useMemo(() => {
        const perf: Record<string, { name: string, План: number, Факт: number }> = {};
        orders.forEach(order => {
            Object.entries(order.procurementStatus || {}).forEach(([cat, data]: [string, any]) => {
                if (!perf[cat]) perf[cat] = { name: cat, План: 0, Факт: 0 };
                perf[cat].План += data.amount || 0;
                (data.items || []).forEach((item: any) => {
                    if (item.status === 'Поступило') {
                        perf[cat].Факт += ((item.receivedQty || item.qty || 0) * (item.price || 0));
                    }
                });
            });
        });
        return Object.values(perf).sort((a, b) => b.План - a.План).slice(0, 6);
    }, [orders]);

    // 2. Monthly Planning Data
    const monthlyData = useMemo(() => {
        const months: Record<string, { sortKey: string, month: string, План: number, Факт: number }> = {};
        
        orders.forEach(order => {
            if (!order.readyDate) return;
            const date = new Date(order.readyDate);
            const sortKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const monthLabel = date.toLocaleString('ru-RU', { month: 'short', year: '2-digit' }).replace(' г.', '');
            
            if (!months[sortKey]) {
                months[sortKey] = { sortKey, month: monthLabel, План: 0, Факт: 0 };
            }
            
            Object.values(order.procurementStatus || {}).forEach((data: any) => {
                months[sortKey].План += data.amount || 0;
                (data.items || []).forEach((item: any) => {
                    if (item.status === 'Поступило') {
                        months[sortKey].Факт += (item.qty * item.price) || 0;
                    }
                });
            });
        });
        
        return Object.values(months).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
    }, [orders]);

    // 3. Category Breakdown for Pie Chart
    const categoryStats = useMemo(() => {
        const stats: Record<string, number> = {};
        orders.forEach(order => {
            Object.entries(order.procurementStatus || {}).forEach(([cat, data]: [string, any]) => {
                if (data.amount > 0) {
                    stats[cat] = (stats[cat] || 0) + data.amount;
                }
            });
        });
        
        return Object.entries(stats)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 8);
    }, [orders]);

    // 4. Bills / Invoices List
    const allBills = useMemo(() => {
        const bills: any[] = [];
        orders.forEach(order => {
            Object.entries(order.procurementStatus || {}).forEach(([category, data]: [string, any]) => {
                (data.items || []).forEach((item: any) => {
                    if (item.status === 'Заказано' || item.status === 'Поступило') {
                        bills.push({
                            ...item,
                            projectName: order.name,
                            category,
                            projectId: order.id
                        });
                    }
                });
            });
        });
        return bills.sort((a, b) => (b.arrivalDate || '').localeCompare(a.arrivalDate || ''));
    }, [orders]);

    // 5. Warehouse Comments feed
    const commentsFeed = useMemo(() => {
        const feed: any[] = [];
        orders.forEach(order => {
            Object.entries(order.procurementStatus || {}).forEach(([category, data]: [string, any]) => {
                (data.items || []).forEach((item: any) => {
                    if (item.comment) {
                        feed.push({
                            projectName: order.name,
                            category,
                            comment: item.comment,
                            date: item.arrivalDate || item.deliveryDate,
                            status: item.status,
                            itemName: item.name
                        });
                    }
                });
            });
        });
        return feed.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    }, [orders]);

    const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#06b6d4', '#64748b'];

    return (
        <div className="flex flex-col min-h-screen bg-[#FAFBFC] p-8 space-y-8">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">План снабжения</h1>
                    <p className="text-gray-500 font-medium mt-1">Аналитика, планирование и контроль закупок компании</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm">
                        <Download className="w-4 h-4" />
                        Экспорт
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200">
                        <Filter className="w-4 h-4" />
                        Фильтры
                    </button>
                </div>
            </header>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Общий бюджет', value: stats.totalBudget.toLocaleString() + ' ₽', icon: RussianRuble, color: 'blue', trend: '+12%' },
                    { label: 'Закуплено (факт)', value: stats.totalActual.toLocaleString() + ' ₽', icon: CheckCircle2, color: 'emerald', trend: '+5%' },
                    { label: 'Всего позиций', value: stats.categoriesInProject, icon: Package, color: 'purple', trend: '0%' },
                    { label: 'Загружено счетов', value: stats.billsCount, icon: FileText, color: 'amber', trend: '+2' }
                ].map((stat, i) => (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        key={i} 
                        className="bg-white p-6 rounded-[2rem] border border-gray-200 shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden"
                    >
                        <div className={cn("absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full opacity-5 group-hover:scale-110 transition-transform duration-500", `bg-${stat.color}-500`)} />
                        <div className="flex items-start justify-between mb-4">
                            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", `bg-${stat.color}-50`)}>
                                <stat.icon className={cn("w-6 h-6", `text-${stat.color}-600`)} />
                            </div>
                            <span className={cn("text-xs font-black px-2 py-1 rounded-full", 
                                stat.trend.includes('+') ? "bg-emerald-50 text-emerald-600" : "bg-gray-50 text-gray-500"
                            )}>
                                {stat.trend}
                            </span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs font-black text-gray-400 uppercase tracking-widest">{stat.label}</span>
                            <span className="text-2xl font-black text-gray-900 mt-1">{stat.value}</span>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-gray-200 shadow-sm"
                >
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-lg font-black text-gray-900">Прогноз закупок по месяцам</h3>
                            <p className="text-sm text-gray-500">План оплат на основе даты готовности заказов</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-blue-500" />
                                <span className="text-[10px] font-bold text-gray-500 uppercase">План</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                                <span className="text-[10px] font-bold text-gray-500 uppercase">Факт</span>
                            </div>
                        </div>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={monthlyData}>
                                <defs>
                                    <linearGradient id="colorPlanned" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis 
                                    dataKey="month" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }}
                                    dy={10}
                                />
                                <YAxis 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }}
                                    tickFormatter={(val) => `${val / 1000}к`}
                                />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                    formatter={(val: number) => [`${val.toLocaleString()} ₽`, '']}
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="План" 
                                    stroke="#3b82f6" 
                                    strokeWidth={3} 
                                    fillOpacity={1} 
                                    fill="url(#colorPlanned)" 
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="Факт" 
                                    stroke="#10b981" 
                                    strokeWidth={3} 
                                    fillOpacity={1} 
                                    fill="url(#colorActual)" 
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white p-8 rounded-[2.5rem] border border-gray-200 shadow-sm flex flex-col"
                >
                    <h3 className="text-lg font-black text-gray-900 mb-2">Распределение бюджета</h3>
                    <p className="text-sm text-gray-500 mb-6">Топ категорий по сумме затрат</p>
                    <div className="flex-1 h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={categoryPerformance} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                <XAxis type="number" hide />
                                <YAxis 
                                    dataKey="name" 
                                    type="category" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    width={100}
                                    tick={{ fontSize: 9, fontWeight: 700, fill: '#64748b' }}
                                />
                                <Tooltip cursor={{ fill: 'transparent' }} />
                                <Bar dataKey="План" fill="#e2e8f0" radius={[0, 4, 4, 0]} barSize={12} />
                                <Bar dataKey="Факт" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={12} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Bills Table */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="lg:col-span-2 bg-white rounded-[2.5rem] border border-gray-200 shadow-sm overflow-hidden"
                >
                    <div className="p-8 border-b border-gray-100 flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-black text-gray-900">Реестр счетов</h3>
                            <p className="text-sm text-gray-500">Все активные закупки и их статусы</p>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input 
                                type="text" 
                                placeholder="Найти счет..." 
                                className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                            />
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50/50">
                                <tr>
                                    <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Проект / Категория</th>
                                    <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Товар</th>
                                    <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Статус</th>
                                    <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Сумма</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {allBills.slice(0, 10).map((bill, i) => (
                                    <tr key={i} className="hover:bg-gray-50/40 transition-colors">
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-black text-gray-900 truncate max-w-[200px]">{bill.projectName}</span>
                                                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-tight mt-1">{bill.category}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                                                    <Package className="w-4 h-4 text-gray-400" />
                                                </div>
                                                <span className="text-xs font-bold text-gray-700 truncate max-w-[200px]">{bill.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex justify-center">
                                                <span className={cn(
                                                    "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                                                    bill.status === 'Поступило' ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"
                                                )}>
                                                    {bill.status}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <span className="text-xs font-black text-gray-900">{((bill.receivedQty || bill.qty || 0) * (bill.price || 0)).toLocaleString()} ₽</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </motion.div>

                {/* Comments Feed */}
                <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-white rounded-[2.5rem] border border-gray-200 shadow-sm flex flex-col"
                >
                    <div className="p-8 border-b border-gray-100">
                        <h3 className="text-lg font-black text-gray-900">Лента склада</h3>
                        <p className="text-sm text-gray-500">Последние комментарии по приходам</p>
                    </div>
                    <div className="flex-1 overflow-y-auto p-8 space-y-6 max-h-[600px] scrollbar-hide">
                        {commentsFeed.length > 0 ? commentsFeed.map((comment, i) => (
                            <div key={i} className="flex gap-4 group">
                                <div className="flex flex-col items-center shrink-0">
                                    <div className={cn(
                                        "w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm transition-transform group-hover:scale-110",
                                        comment.status === 'Поступило' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                                    )}>
                                        <MessageSquare className="w-5 h-5" />
                                    </div>
                                    <div className="w-px flex-1 bg-gray-100 my-2" />
                                </div>
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                            {comment.date ? new Date(comment.date).toLocaleDateString() : '—'}
                                        </span>
                                        <span className="w-1 h-1 rounded-full bg-gray-200" />
                                        <span className="text-[10px] font-bold text-blue-600 truncate max-w-[120px] uppercase tracking-tighter">
                                            {comment.projectName}
                                        </span>
                                    </div>
                                    <p className="text-[13px] font-medium text-gray-700 leading-relaxed bg-gray-50 p-3 rounded-2xl border border-gray-100 italic">
                                        "{comment.comment}"
                                    </p>
                                    <span className="text-[9px] font-bold text-gray-400 mt-2">По товару: {comment.itemName}</span>
                                </div>
                            </div>
                        )) : (
                            <div className="flex flex-col items-center justify-center h-full text-center p-8 opacity-50">
                                <Clock className="w-12 h-12 mb-4 text-gray-300" />
                                <p className="text-sm font-bold text-gray-400">Комментариев пока нет</p>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

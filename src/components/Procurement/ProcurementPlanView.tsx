import React, { useMemo } from 'react';
import { 
    ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
    BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
    Download, Filter, Package, AlertTriangle, 
    CheckCircle2, Clock, Truck, ShieldAlert,
    TrendingUp, RussianRuble
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion } from 'framer-motion';

export const ProcurementPlanView = ({ 
    orders, 
    companyData 
}: { 
    orders: any[];
    companyData: any;
}) => {
    // 1. Core overall stats
    const stats = useMemo(() => {
        let totalBudget = 0;
        let totalActual = 0;
        let inTransitAmount = 0;
        let problemItemsCount = 0;

        orders.forEach(order => {
            Object.values(order.procurementStatus || {}).forEach((data: any) => {
                totalBudget += data.amount || 0;
                (data.items || []).forEach((item: any) => {
                    const price = item.price || 0;
                    if (item.status === 'Поступило') {
                        totalActual += ((item.receivedQty || item.qty || 0) * price);
                    } else if (item.status === 'Заказано') {
                        inTransitAmount += ((item.qty || 0) * price);
                    }

                    if (item.hasProblem || (item.status === 'Поступило' && (item.receivedQty || 0) < (item.qty || 0))) {
                        problemItemsCount++;
                    }
                });
            });
        });
        
        return {
            totalBudget,
            totalActual,
            inTransitAmount,
            problemItemsCount
        };
    }, [orders]);

    // 2. Monthly execution vs plan (Plan vs Amount fact vs Amount in transit)
    const monthlyData = useMemo(() => {
        const months: Record<string, { sortKey: string, month: string, План: number, Факт: number, 'В пути': number }> = {};
        
        orders.forEach(order => {
            if (!order.readyDate) return;
            const date = new Date(order.readyDate);
            const sortKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const monthLabel = date.toLocaleString('ru-RU', { month: 'short', year: '2-digit' }).replace(' г.', '');
            
            if (!months[sortKey]) {
                months[sortKey] = { sortKey, month: monthLabel, План: 0, Факт: 0, 'В пути': 0 };
            }
            
            Object.values(order.procurementStatus || {}).forEach((data: any) => {
                months[sortKey].План += data.amount || 0;
                (data.items || []).forEach((item: any) => {
                    const price = item.price || 0;
                    if (item.status === 'Поступило') {
                        months[sortKey].Факт += ((item.receivedQty || item.qty || 0) * price);
                    } else if (item.status === 'Заказано') {
                        months[sortKey]['В пути'] += ((item.qty || 0) * price);
                    }
                });
            });
        });
        
        return Object.values(months).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
    }, [orders]);

    // 3. Status Funnel Data
    const statusData = useMemo(() => {
        let notOrdered = 0;
        let ordered = 0;
        let received = 0;
        
        orders.forEach(order => {
            Object.values(order.procurementStatus || {}).forEach((data: any) => {
                (data.items || []).forEach((item: any) => {
                    if (item.status === 'Поступило') received++;
                    else if (item.status === 'Заказано') ordered++;
                    else notOrdered++;
                });
            });
        });
        
        return [
            { name: 'Не заказано', value: notOrdered, color: '#f87171' },
            { name: 'В пути', value: ordered, color: '#fbbf24' },
            { name: 'Поступило', value: received, color: '#34d399' }
        ].filter(d => d.value > 0);
    }, [orders]);

    // 4. Problematic Orders feed
    const problemFeed = useMemo(() => {
        const feed: any[] = [];
        orders.forEach(order => {
            Object.entries(order.procurementStatus || {}).forEach(([category, data]: [string, any]) => {
                (data.items || []).forEach((item: any) => {
                    const hasIssue = item.hasProblem || (item.status === 'Поступило' && (item.receivedQty || 0) < (item.qty || 0));
                    if (hasIssue) {
                        feed.push({
                            projectName: order.name,
                            category,
                            itemName: item.name,
                            supplierId: item.supplierId,
                            issueDetails: item.hasProblem ? 'Помечено складом как проблемное' : `Недовоз: получили ${item.receivedQty || 0} из ${item.qty}`,
                            date: item.arrivalDate || item.deliveryDate || order.readyDate
                        });
                    }
                });
            });
        });
        return feed.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    }, [orders]);

    return (
        <div className="flex flex-col min-h-screen bg-[#FAFBFC] p-8 space-y-8">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Аналитика снабжения</h1>
                    <p className="text-gray-500 font-medium mt-1">Оценка затрат, долгов и проблем на складе</p>
                </div>
            </header>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Бюджет по сделкам', value: stats.totalBudget.toLocaleString() + ' ₽', icon: RussianRuble, color: 'blue', desc: 'Заложено в спецификациях' },
                    { label: 'Уже закуплено', value: stats.totalActual.toLocaleString() + ' ₽', icon: CheckCircle2, color: 'emerald', desc: 'Уже лежит на складе' },
                    { label: 'Сумма в пути', value: stats.inTransitAmount.toLocaleString() + ' ₽', icon: Truck, color: 'amber', desc: 'Заказано, но не прибыло' },
                    { label: 'Ошибки прихода', value: stats.problemItemsCount, icon: ShieldAlert, color: 'rose', desc: 'Брак и недовозы' }
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
                            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner", `bg-${stat.color}-50`)}>
                                <stat.icon className={cn("w-6 h-6", `text-${stat.color}-600`)} />
                            </div>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs font-black text-gray-400 uppercase tracking-widest">{stat.label}</span>
                            <span className="text-2xl font-black text-gray-900 mt-1">{stat.value}</span>
                            <span className="text-[10px] font-bold text-gray-400 mt-2">{stat.desc}</span>
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Graph */}
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-gray-200 shadow-sm flex flex-col"
                >
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-lg font-black text-gray-900">Узкие горлышки поставок</h3>
                            <p className="text-sm text-gray-500">Сравнение: заложенный бюджет, стоимость товаров в пути и фактически закупленных (по дате готовности заказа)</p>
                        </div>
                    </div>
                    <div className="h-[300px] w-full mt-auto">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={monthlyData}>
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
                                    cursor={{fill: '#f8fafc'}}
                                />
                                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                                <Bar dataKey="План" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="В пути" fill="#fbbf24" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="Факт" fill="#10b981" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* Status Funnel */}
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white p-8 rounded-[2.5rem] border border-gray-200 shadow-sm flex flex-col items-center justify-center relative overflow-hidden"
                >
                    <h3 className="text-lg font-black text-gray-900 absolute top-8 left-8">Воронка позиций</h3>
                    <p className="text-sm text-gray-500 absolute top-14 left-8">Общее распределение статусов всех закупаемых товаров</p>
                    <div className="w-full h-[250px] mt-12 relative flex items-center justify-center">
                        {statusData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={statusData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {statusData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip 
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                                        itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="text-center text-gray-400 font-bold">Нет данных для воронки</div>
                        )}
                        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                            <span className="text-3xl font-black text-gray-900">{statusData.reduce((acc, curr) => acc + curr.value, 0)}</span>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Позиций</span>
                        </div>
                    </div>
                    <div className="flex flex-wrap justify-center gap-4 mt-6">
                        {statusData.map((s, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                                <span className="text-xs font-bold text-gray-600">{s.name} ({s.value})</span>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Problem Feed */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-[2.5rem] border border-rose-200 shadow-sm overflow-hidden flex flex-col lg:col-span-2"
                >
                    <div className="p-8 border-b border-rose-100 bg-rose-50 flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-black text-rose-900 flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5" />
                                Журнал проблем на складе
                            </h3>
                            <p className="text-sm text-rose-600/70 mt-1">Ошибки приемки, браки и недовозы поставщиков</p>
                        </div>
                    </div>
                    <div className="flex-1 p-8 overflow-y-auto max-h-[400px]">
                        {problemFeed.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {problemFeed.map((prob, i) => (
                                    <div key={i} className="border border-rose-100 bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center shrink-0">
                                                <Package className="w-5 h-5 text-rose-500" />
                                            </div>
                                            <span className="text-[10px] font-black text-rose-600 bg-rose-100 px-2 py-1 rounded-lg uppercase">
                                                {prob.date ? new Date(prob.date).toLocaleDateString() : 'Дата неизвестна'}
                                            </span>
                                        </div>
                                        <h4 className="text-sm font-black text-gray-900 line-clamp-2 leading-tight flex-1">
                                            {prob.itemName || 'Безымянный товар'}
                                        </h4>
                                        <div className="w-full h-px bg-gray-100 my-4" />
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-gray-500">Сделка:</span>
                                                <span className="font-bold text-gray-700 truncate max-w-[120px]">{prob.projectName}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-gray-500">Категория:</span>
                                                <span className="font-bold text-gray-700 truncate max-w-[120px]">{prob.category}</span>
                                            </div>
                                            <div className="mt-3 bg-rose-50 rounded-lg p-3 text-xs font-bold text-rose-700 leading-relaxed border border-rose-100">
                                                {prob.issueDetails}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center p-12 text-center">
                                <CheckCircle2 className="w-16 h-16 text-emerald-400 mb-4" />
                                <h3 className="text-xl font-black text-gray-900 mb-2">Проблем не обнаружено</h3>
                                <p className="text-sm text-gray-500">Все товары приняты складом корректно и без ошибок.</p>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

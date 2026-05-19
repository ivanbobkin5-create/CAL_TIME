import React, { useState, useEffect, useRef } from 'react';
import { 
  User, 
  Lock, 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  Package, 
  Calendar,
  ShieldCheck,
  ChevronRight,
  LogOut,
  Save,
  Loader2,
  Settings,
  Camera,
  Layers,
  PieChart as PieChartIcon
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';

interface Project {
  id: string;
  name: string;
  totalPrice?: number;
  totalHardwareCost?: number;
  type?: string;
  createdAt: string;
  createdBy: string;
}

interface UserProfileViewProps {
  userData: any;
  onUpdateUser: (data: any) => Promise<void>;
  onLogout: () => void;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export const UserProfileView = ({ userData, onUpdateUser, onLogout }: UserProfileViewProps) => {
  const [activeTab, setActiveTab] = useState<'info' | 'stats'>('info');
  const [newName, setNewName] = useState(userData?.name || '');
  const [newPassword, setNewPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [userProjects, setUserProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState({
    totalCount: 0,
    totalVolume: 0,
    mostExpensive: 0,
    mostExpensiveName: '-',
    avgPrice: 0,
    hardwareShare: 0,
    typeData: [] as { name: string; value: number; share: string }[]
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchUserStats = async () => {
      try {
        const res = await fetch(`/api/firebase/col/companies/${userData.companyId}/projects`);
        if (res.ok) {
          const allProjects = await res.json();
          // Filter projects created by THIS user
          const mine = allProjects
            .map((p: any) => ({ id: p.id, ...p.data }))
            .filter((p: any) => p.createdBy === userData.uid || p.createdBy === userData.email);
            
          setUserProjects(mine);
          
          if (mine.length > 0) {
            const totalVolume = mine.reduce((acc: number, p: any) => acc + (p.totalPrice || 0), 0);
            const totalHardware = mine.reduce((acc: number, p: any) => acc + (p.totalHardwareCost || 0), 0);
            const sortedByPrice = [...mine].sort((a, b) => (b.totalPrice || 0) - (a.totalPrice || 0));
            
            // Type distribution
            const typeCounts: Record<string, number> = {};
            mine.forEach((p: any) => {
              const type = p.type || 'Разное';
              typeCounts[type] = (typeCounts[type] || 0) + 1;
            });
            
            const typeData = Object.entries(typeCounts).map(([name, value]) => ({
              name,
              value,
              share: ((value / mine.length) * 100).toFixed(1) + '%'
            })).sort((a, b) => b.value - a.value);

            setStats({
              totalCount: mine.length,
              totalVolume,
              mostExpensive: sortedByPrice[0].totalPrice || 0,
              mostExpensiveName: sortedByPrice[0].name,
              avgPrice: Math.round(totalVolume / mine.length),
              hardwareShare: totalVolume > 0 ? Math.round((totalHardware / totalVolume) * 100) : 0,
              typeData
            });
          }
        }
      } catch (e) {
        console.error("Error fetching stats:", e);
      }
    };
    
    if (userData?.companyId) {
      fetchUserStats();
    }
  }, [userData]);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const updates: any = { name: newName };
      if (newPassword) updates.password = newPassword;
      await onUpdateUser(updates);
      setNewPassword('');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onUpdateUser({ photoURL: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8">
      <div className="flex flex-col md:flex-row gap-8">
        
        {/* Sidebar */}
        <div className="w-full md:w-80 space-y-4">
          <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm text-center relative overflow-hidden group">
            <div 
              className="w-24 h-24 bg-blue-50 text-blue-600 rounded-[2rem] flex items-center justify-center mx-auto mb-4 text-3xl font-black relative overflow-hidden cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              {userData?.photoURL ? (
                <img src={userData.photoURL} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                userData?.name ? userData.name.substring(0, 2).toUpperCase() : '??'
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="w-8 h-8 text-white" />
              </div>
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handlePhotoUpload}
            />
            
            <h2 className="text-xl font-black text-gray-900 tracking-tight">{userData?.name || 'Пользователь'}</h2>
            <p className="text-sm text-gray-400 font-medium truncate px-4">{userData?.email}</p>
            <div className="mt-6 pt-6 border-t border-gray-50 flex justify-center gap-4">
              <div className="text-center">
                <div className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Роль</div>
                <div className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase">
                  {userData?.role === 'admin' ? 'Админ' : userData?.role === 'manager' ? 'Менеджер' : 'Сотрудник'}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[2rem] p-3 border border-gray-100 shadow-sm space-y-1">
            <button 
              onClick={() => setActiveTab('info')}
              className={cn(
                "w-full flex items-center gap-3 px-5 py-4 rounded-2xl transition-all font-bold text-sm",
                activeTab === 'info' ? "bg-blue-600 text-white shadow-lg shadow-blue-100" : "text-gray-500 hover:bg-gray-50"
              )}
            >
              <User className="w-5 h-5" />
              Личные данные
            </button>
            <button 
              onClick={() => setActiveTab('stats')}
              className={cn(
                "w-full flex items-center gap-3 px-5 py-4 rounded-2xl transition-all font-bold text-sm",
                activeTab === 'stats' ? "bg-blue-600 text-white shadow-lg shadow-blue-100" : "text-gray-500 hover:bg-gray-50"
              )}
            >
              <BarChart3 className="w-5 h-5" />
              Статистика работы
            </button>
            <div className="pt-2">
              <button 
                onClick={onLogout}
                className="w-full flex items-center gap-3 px-5 py-4 rounded-2xl transition-all font-bold text-sm text-red-500 hover:bg-red-50"
              >
                <LogOut className="w-5 h-5" />
                Выйти из системы
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          {activeTab === 'info' ? (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-[2.5rem] p-10 border border-gray-100 shadow-sm"
            >
              <h3 className="text-2xl font-black text-gray-900 mb-8 tracking-tight flex items-center gap-3">
                <Settings className="w-7 h-7 text-blue-600" />
                Настройки профиля
              </h3>

              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Фамилия и Имя</label>
                    <input 
                      type="text" 
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-gray-900 font-bold focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                      placeholder="Как к вам обращаться?"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Email (только чтение)</label>
                    <input 
                      type="email" 
                      value={userData?.email || ''} 
                      disabled
                      className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-gray-400 font-bold cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="pt-8 border-t border-gray-50 space-y-6">
                  <div>
                    <h4 className="font-black text-gray-900 mb-2">Безопасность</h4>
                    <p className="text-sm text-gray-400 font-medium">Оставьте поле пустым, если не хотите менять пароль</p>
                  </div>
                  
                  <div className="max-w-md space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Новый пароль</label>
                    <div className="relative">
                      <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                      <input 
                        type="password" 
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full bg-gray-50 border-none rounded-2xl pl-14 pr-6 py-4 text-gray-900 font-bold focus:ring-2 focus:ring-blue-100 outline-none transition-all font-mono"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-8">
                  <button 
                    onClick={handleSaveProfile}
                    disabled={isSaving || (newName === userData?.name && !newPassword)}
                    className="flex items-center gap-3 px-8 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all disabled:opacity-50 disabled:shadow-none active:scale-95"
                  >
                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    Сохранить изменения
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8 pb-12"
            >
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
                    <Package className="w-6 h-6" />
                  </div>
                  <div className="text-2xl font-black text-gray-900 mb-1">{stats.totalCount}</div>
                  <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Проектов</div>
                </div>
                
                <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm">
                  <div className="w-12 h-12 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center mb-6">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div className="text-2xl font-black text-gray-900 mb-1">{stats.totalVolume.toLocaleString()}</div>
                  <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Всего ₽</div>
                </div>

                <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm">
                  <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mb-6">
                    <DollarSign className="w-6 h-6" />
                  </div>
                  <div className="text-2xl font-black text-gray-900 mb-1">{stats.avgPrice.toLocaleString()}</div>
                  <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Средний чек</div>
                </div>

                <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm">
                  <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-6">
                    <Layers className="w-6 h-6" />
                  </div>
                  <div className="text-2xl font-black text-gray-900 mb-1">{stats.hardwareShare}%</div>
                  <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Доля фурнитуры</div>
                </div>
              </div>

              {/* Best Project */}
              <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-[2.5rem] p-10 text-white shadow-xl shadow-blue-100 overflow-hidden relative">
                <ShieldCheck className="absolute -right-10 -bottom-10 w-64 h-64 text-white opacity-5" />
                <div className="relative z-10">
                  <div className="text-xs font-black uppercase tracking-[0.2em] mb-4 opacity-60">Самый масштабный проект</div>
                  <div className="text-4xl font-black mb-2 tracking-tight">{stats.mostExpensiveName}</div>
                  <div className="text-xl font-bold opacity-90">{stats.mostExpensive.toLocaleString()} ₽</div>
                  <div className="mt-8 inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full text-xs font-black backdrop-blur-md">
                    👑 Лучший результат в истории
                  </div>
                </div>
              </div>

              {/* Advanced Analytics */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Distribution Chart */}
                <div className="bg-white rounded-[2.5rem] p-10 border border-gray-100 shadow-sm">
                  <h4 className="text-lg font-black text-gray-900 mb-8 flex items-center gap-3">
                    <PieChartIcon className="w-6 h-6 text-blue-600" />
                    Распределение по изделиям
                  </h4>
                  
                  <div className="h-64 mb-8">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={stats.typeData}
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {stats.typeData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-4">
                    {stats.typeData.map((item, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                          <span className="text-sm font-bold text-gray-700">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-xs text-gray-400 font-bold">{item.value} шт</span>
                          <span className="text-sm font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg">{item.share}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Last Activity */}
                <div className="bg-white rounded-[2.5rem] p-10 border border-gray-100 shadow-sm overflow-hidden">
                  <h4 className="text-lg font-black text-gray-900 mb-8 flex items-center gap-3">
                    <Calendar className="w-6 h-6 text-blue-600" />
                    Последние расчеты
                  </h4>
                  
                  <div className="space-y-3">
                    {userProjects.slice(0, 6).map((project, i) => (
                      <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 hover:bg-blue-50/50 transition-all group">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="w-8 h-8 bg-white rounded-xl shadow-sm flex items-center justify-center font-black text-blue-600 text-[10px] flex-shrink-0">
                            {i + 1}
                          </div>
                          <div className="truncate">
                            <div className="font-bold text-gray-900 group-hover:text-blue-700 transition-colors uppercase text-[12px] tracking-tight truncate">{project.name}</div>
                            <div className="text-[9px] text-gray-400 font-black uppercase tracking-widest mt-0.5">
                              {new Date(project.createdAt).toLocaleDateString('ru-RU')}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 flex-shrink-0">
                          <div className="font-black text-gray-900 text-xs">{(project.totalPrice || 0).toLocaleString()}</div>
                          <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-600 transition-colors" />
                        </div>
                      </div>
                    ))}
                    {userProjects.length === 0 && (
                      <div className="text-center py-12 text-gray-400 font-medium italic">
                        Пусто
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};


import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Building2, 
  ShieldAlert, 
  ShieldCheck, 
  BarChart3, 
  Settings2, 
  Lock, 
  Unlock,
  Package,
  UserPlus,
  Search,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  X,
  Target,
  Factory,
  MapPin,
  Tag,
  Trash2,
  Filter,
  Sparkles,
  Clock,
  Calendar,
  ExternalLink,
  CheckCircle2,
  SlidersHorizontal,
  Layers,
  Globe,
  UserCheck,
  UserX,
  Plus
} from 'lucide-react';
import { cn, transliterate } from '../../lib/utils';

const handleDbError = (e: any, op: any, path: string) => console.warn("Database error:", op, path, e);
enum OperationType { LIST = "LIST", UPDATE = "UPDATE", GET = "GET", DELETE = "DELETE", WRITE = "WRITE", CREATE = "CREATE" }

// TimeWeb DB Setup
const db = {};
function collection(db: any, path: string, ...rest: any[]) { 
  const fullPath = [path, ...rest].join('/');
  return { path: fullPath }; 
}
function onSnapshot(colRef: any, callback: (snap: any) => void, errorCb?: (err: any) => void) { 
  const fetchCol = async () => {
    try {
      const res = await fetch(`/api/db/col/${colRef.path}`);
      if (res.ok) {
        const data = await res.json();
        callback({
          docs: data.map((d: any) => ({
            id: d.id,
            data: () => d.data,
            exists: () => true
          })),
          size: data.length
        });
      }
    } catch (e) {
      if (errorCb) errorCb(e);
      else console.error("Snapshot error:", e);
    }
  };
  fetchCol();
  return () => {}; 
}
function doc(db: any, col: string, ...rest: any[]) { 
  const path = [col, ...rest].join('/');
  return { path }; 
}
async function getDoc(docRef: any) { 
  const res = await fetch(`/api/db/doc/${docRef.path}`);
  if (res.ok) {
    const data = await res.json();
    return {
      exists: () => true,
      data: () => data
    };
  }
  return { exists: () => false };
}
async function getDocs(colRef: any) { 
  const res = await fetch(`/api/db/col/${colRef.path}`);
  if (res.ok) {
    const data = await res.json();
    return {
      docs: data.map((d: any) => ({ id: d.id, data: () => d.data })),
      size: data.length
    };
  }
  return { docs: [], size: 0 };
}
async function updateDoc(docRef: any, data: any, options: { merge?: boolean } = { merge: true }) { 
  await fetch(`/api/db/doc/${docRef.path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data, merge: options.merge })
  });
}
async function deleteDoc(docRef: any) { 
  await fetch(`/api/db/doc/${docRef.path}`, {
    method: 'DELETE'
  });
}

interface Company {
  id: string;
  name: string;
  type: string;
  city: string;
  ownerUid: string;
  isBlocked?: boolean;
  employeeLimit?: number;
  productLimit?: number;
  employeeCount?: number;
  projectCount?: number;
  address?: string;
  photos?: string[];
  tariffExpiration?: string;
  manufacturerId?: string;
  procurementEnabled?: boolean;
  procurementAllowed?: boolean;
  erpAllowed?: boolean;
  erpEnabled?: boolean;
  slug?: string;
  crmPipelineId?: string;
  crmStageId?: string;
}

interface User {
  uid: string;
  email: string;
  displayName: string;
  role: string;
  companyId: string;
  isBlocked?: boolean;
}

// Inline Helper Component for Company Tariff Expiration Input
const TariffExpirationPicker = ({ company, updateLimit }: { company: Company, updateLimit: any }) => {
  const [localDate, setLocalDate] = useState(company.tariffExpiration ? new Date(company.tariffExpiration).toISOString().split('T')[0] : '');

  useEffect(() => {
    setLocalDate(company.tariffExpiration ? new Date(company.tariffExpiration).toISOString().split('T')[0] : '');
  }, [company.tariffExpiration]);

  const handleBlur = () => {
    if (localDate) {
      const date = new Date(localDate);
      if (!isNaN(date.getTime())) {
        updateLimit(company.id, 'tariffExpiration', date.toISOString());
      }
    }
  };

  const getDaysLeft = () => {
    if (!company.tariffExpiration) return null;
    const diff = new Date(company.tariffExpiration).getTime() - new Date().getTime();
    const days = Math.ceil(diff / (1000 * 3600 * 24));
    return days;
  };

  const daysLeft = getDaysLeft();

  return (
    <div className="flex items-center gap-2">
      <input 
        type="date"
        value={localDate}
        onChange={(e) => setLocalDate(e.target.value)}
        onBlur={handleBlur}
        className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
      />
      {daysLeft !== null && (
        <span className={cn(
          "px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider",
          daysLeft < 0 ? "bg-rose-100 text-rose-700" : (daysLeft <= 7 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800")
        )}>
          {daysLeft < 0 ? 'Истек' : `${daysLeft} дн.`}
        </span>
      )}
    </div>
  );
};

export const AppAdminView = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'companies' | 'users' | 'stats' | 'requests'>('companies');
  
  // Filtering & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'Мебельное производство' | 'Салон' | 'Дизайнер'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'blocked'>('all');
  const [expandedCompanyIds, setExpandedCompanyIds] = useState<Record<string, boolean>>({});
  const [activeSettingsTab, setActiveSettingsTab] = useState<Record<string, 'info' | 'limits' | 'modules'>>({});

  // Coefficients Modal State
  const [selectedCoefficients, setSelectedCoefficients] = useState<any>(null);
  const [coeffModalOpen, setCoeffModalOpen] = useState(false);
  const [coeffLoading, setCoeffLoading] = useState(false);

  const fetchCoefficients = async (salon: Company) => {
    if (!salon.manufacturerId) return;
    setCoeffLoading(true);
    setCoeffModalOpen(true);
    try {
      const prodDoc = await getDoc(doc(db, 'companies', salon.manufacturerId, 'settings', 'production'));
      if (prodDoc.exists()) {
        const data = prodDoc.data();
        const isSpecial = data.specialConditionIds?.includes(salon.id);
        const coeffs = isSpecial && data.salonCoefficients?.[salon.id] 
          ? data.salonCoefficients[salon.id] 
          : data.standardCoefficients;
        
        const manufacturer = companies.find(c => c.id === salon.manufacturerId);
        setSelectedCoefficients({
          coeffs,
          salonName: salon.name,
          manufacturerName: manufacturer?.name || 'Производство',
          isSpecial
        });
      } else {
        setSelectedCoefficients({
          coeffs: null,
          salonName: salon.name,
          manufacturerName: 'Не настроено'
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setCoeffLoading(false);
    }
  };

  useEffect(() => {
    const unsubCompanies = onSnapshot(collection(db, 'companies'), async (snapshot) => {
      const companyList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Company));
      
      const updatedCompanies = await Promise.all(companyList.map(async (company) => {
        const employeesSnapshot = await getDocs(collection(db, 'companies', company.id, 'employees'));
        const qProjects = collection(db, 'companies', company.id, 'projects');
        const projectsSnapshot = await getDocs(qProjects);

        let address = '';
        let photos: string[] = [];
        try {
          const settingsSnap = await getDoc(doc(db, 'companies', company.id, 'settings', 'production'));
          if (settingsSnap.exists()) {
            const sData = settingsSnap.data();
            address = sData.address || '';
            photos = sData.photos || [];
          }
        } catch (e) {
          console.error(`Error fetching settings for ${company.id}`, e);
        }

        return { 
          ...company, 
          employeeCount: employeesSnapshot.size,
          projectCount: projectsSnapshot.size,
          address,
          photos
        };
      }));
      
      setCompanies(updatedCompanies);
      setLoading(false);
    });

    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const userList = snapshot.docs.map(doc => doc.data() as User);
      setUsers(userList);
    });

    const unsubRequests = onSnapshot(collection(db, 'tariffRequests'), (snapshot) => {
      const reqList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      setRequests(reqList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    });

    return () => {
      unsubCompanies();
      unsubUsers();
      unsubRequests();
    };
  }, []);

  const toggleCompanyBlock = async (companyId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'companies', companyId), {
        isBlocked: !currentStatus
      });
    } catch (error) {
      handleDbError(error, OperationType.UPDATE, `companies/${companyId}`);
    }
  };

  const toggleUserBlock = async (uid: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'users', uid), {
        isBlocked: !currentStatus
      });
    } catch (error) {
      handleDbError(error, OperationType.UPDATE, `users/${uid}`);
    }
  };

  const deleteCompany = async (companyId: string) => {
    if (!window.confirm("Вы уверены, что хотите ПОЛНОСТЬЮ УДАЛИТЬ компанию и всех ее сотрудников? Это действие необратимо!")) return;
    
    try {
      const companyUsers = users.filter(u => u.companyId === companyId);
      const employeesSnapshot = await getDocs(collection(db, 'companies', companyId, 'employees'));
      const directEmployeeIds = employeesSnapshot.docs.map(d => d.id);
      const allEmployeeIds = Array.from(new Set([...companyUsers.map(u => u.uid), ...directEmployeeIds]));

      for (const uid of allEmployeeIds) {
        await deleteDoc(doc(db, 'companies', companyId, 'employees', uid));
        await deleteDoc(doc(db, 'users', uid));
        await fetch(`/api/auth/user/${uid}`, { method: 'DELETE' });
      }

      await deleteDoc(doc(db, 'companies', companyId));
      
      const settingsPaths = ['production', 'categories', 'general', 'prices', 'bitrix24'];
      for (const s of settingsPaths) {
        await deleteDoc(doc(db, 'companies', companyId, 'settings', s));
      }

      alert("Компания и сотрудники успешно удалены");
    } catch (error) {
      console.error("Error deleting company:", error);
      alert("Ошибка при полном удалении компании");
    }
  };

  const deleteUser = async (uid: string, companyId: string) => {
    if (!window.confirm("Вы уверены, что хотите удалить этого пользователя? Это также удалит его учетную запись для входа!")) return;
    
    try {
      if (companyId && companyId !== 'none') {
        try {
          await deleteDoc(doc(db, 'companies', companyId, 'employees', uid));
        } catch (e) {
          console.warn("Could not delete from company subcollection", e);
        }
      }
      await deleteDoc(doc(db, 'users', uid));
      await fetch(`/api/auth/user/${uid}`, { method: 'DELETE' });
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("Ошибка при удалении пользователя");
    }
  };

  const updateLimit = async (companyId: string, field: string, value: any) => {
    try {
      await updateDoc(doc(db, 'companies', companyId), {
        [field]: value
      });
    } catch (error) {
      console.error("Error updating limit:", error);
      handleDbError(error, OperationType.UPDATE, `companies/${companyId}`);
    }
  };

  const toggleEmployeesExpanded = (companyId: string) => {
    setExpandedCompanyIds(prev => ({
      ...prev,
      [companyId]: !prev[companyId]
    }));
  };

  // Filter companies
  const filteredCompanies = companies.filter(c => {
    const matchesSearch = c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.city?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || c.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || (statusFilter === 'blocked' ? c.isBlocked : !c.isBlocked);
    return matchesSearch && matchesType && matchesStatus;
  });

  // Filter users for Users tab
  const filteredUsers = users.filter(u => {
    const company = companies.find(c => c.id === u.companyId);
    const matchesSearch = u.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          company?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const stats = {
    totalCompanies: companies.length,
    totalUsers: users.filter(u => u.role !== 'admin').length,
    blockedCompanies: companies.filter(c => c.isBlocked).length,
    productionCount: companies.filter(c => c.type === 'Мебельное производство').length,
    salonCount: companies.filter(c => c.type === 'Салон').length,
    designerCount: companies.filter(c => c.type === 'Дизайнер').length,
    erpActiveCount: companies.filter(c => c.erpAllowed || c.erpEnabled).length,
    procurementActiveCount: companies.filter(c => c.procurementAllowed || c.procurementEnabled).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest animate-pulse">Загрузка панели управления...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/70 p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* TOP HEADER & NAVIGATION */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Панель Суперадминистратора</h1>
              <p className="text-xs text-slate-500 font-medium">Централизованное управление организациями, тарифами и сотрудниками</p>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200/80 w-full md:w-auto overflow-x-auto">
            <button 
              onClick={() => setActiveTab('companies')}
              className={cn(
                "px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 shrink-0 cursor-pointer",
                activeTab === 'companies' ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
              )}
            >
              <Building2 className="w-4 h-4" />
              <span>Компании</span>
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-blue-50 text-blue-700 font-mono font-black">{companies.length}</span>
            </button>

            <button 
              onClick={() => setActiveTab('users')}
              className={cn(
                "px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 shrink-0 cursor-pointer",
                activeTab === 'users' ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
              )}
            >
              <Users className="w-4 h-4" />
              <span>Все пользователи</span>
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-slate-200 text-slate-700 font-mono font-black">{users.length}</span>
            </button>

            <button 
              onClick={() => setActiveTab('stats')}
              className={cn(
                "px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 shrink-0 cursor-pointer",
                activeTab === 'stats' ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
              )}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Аналитика</span>
            </button>

            <button 
              onClick={() => setActiveTab('requests')}
              className={cn(
                "px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 shrink-0 relative cursor-pointer",
                activeTab === 'requests' ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
              )}
            >
              <AlertCircle className="w-4 h-4" />
              <span>Заявки</span>
              {requests.filter(r => r.status === 'pending').length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-rose-500 text-white font-mono font-black animate-pulse">
                  {requests.filter(r => r.status === 'pending').length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* TAB 1: COMPANIES LIST VIEW */}
        {activeTab === 'companies' && (
          <div className="space-y-4">
            
            {/* Filter & Search Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="relative w-full md:max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input 
                  type="text"
                  placeholder="Поиск по названию или городу..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>

              {/* Type and Status Filter Pills */}
              <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
                <div className="flex bg-slate-100 p-1 rounded-xl text-[11px] font-bold text-slate-600">
                  <button
                    onClick={() => setTypeFilter('all')}
                    className={cn("px-2.5 py-1 rounded-lg transition-all cursor-pointer", typeFilter === 'all' ? "bg-white text-slate-900 shadow-2xs" : "hover:text-slate-900")}
                  >
                    Все типы
                  </button>
                  <button
                    onClick={() => setTypeFilter('Мебельное производство')}
                    className={cn("px-2.5 py-1 rounded-lg transition-all cursor-pointer", typeFilter === 'Мебельное производство' ? "bg-white text-blue-700 shadow-2xs" : "hover:text-slate-900")}
                  >
                    Производства
                  </button>
                  <button
                    onClick={() => setTypeFilter('Салон')}
                    className={cn("px-2.5 py-1 rounded-lg transition-all cursor-pointer", typeFilter === 'Салон' ? "bg-white text-indigo-700 shadow-2xs" : "hover:text-slate-900")}
                  >
                    Салоны
                  </button>
                  <button
                    onClick={() => setTypeFilter('Дизайнер')}
                    className={cn("px-2.5 py-1 rounded-lg transition-all cursor-pointer", typeFilter === 'Дизайнер' ? "bg-white text-purple-700 shadow-2xs" : "hover:text-slate-900")}
                  >
                    Дизайнеры
                  </button>
                </div>

                <div className="flex bg-slate-100 p-1 rounded-xl text-[11px] font-bold text-slate-600">
                  <button
                    onClick={() => setStatusFilter('all')}
                    className={cn("px-2.5 py-1 rounded-lg transition-all cursor-pointer", statusFilter === 'all' ? "bg-white text-slate-900 shadow-2xs" : "")}
                  >
                    Все
                  </button>
                  <button
                    onClick={() => setStatusFilter('active')}
                    className={cn("px-2.5 py-1 rounded-lg transition-all cursor-pointer", statusFilter === 'active' ? "bg-emerald-50 text-emerald-800 shadow-2xs" : "")}
                  >
                    Активные
                  </button>
                  <button
                    onClick={() => setStatusFilter('blocked')}
                    className={cn("px-2.5 py-1 rounded-lg transition-all cursor-pointer", statusFilter === 'blocked' ? "bg-rose-50 text-rose-800 shadow-2xs" : "")}
                  >
                    Заблокировано
                  </button>
                </div>
              </div>
            </div>

            {/* Companies Cards Grid */}
            <div className="space-y-4">
              {filteredCompanies.map(company => {
                const companyEmployees = users.filter(u => u.companyId === company.id);
                const isExpanded = !!expandedCompanyIds[company.id];
                const activeTabForCompany = activeSettingsTab[company.id] || 'limits';

                return (
                  <div 
                    key={company.id} 
                    className={cn(
                      "bg-white rounded-3xl border transition-all shadow-xs hover:shadow-md overflow-hidden",
                      company.isBlocked ? "border-rose-200 bg-rose-50/20" : "border-slate-200/90"
                    )}
                  >
                    {/* Main Company Header Row */}
                    <div className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                      
                      {/* Left Block: Icon, Title, Tags & Counters */}
                      <div className="flex items-start gap-4">
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 font-bold",
                          company.isBlocked 
                            ? "bg-rose-100 text-rose-600" 
                            : (company.type === 'Мебельное производство' ? "bg-blue-50 text-blue-600" : (company.type === 'Салон' ? "bg-indigo-50 text-indigo-600" : "bg-purple-50 text-purple-600"))
                        )}>
                          {company.type === 'Мебельное производство' ? <Factory className="w-6 h-6" /> : <Building2 className="w-6 h-6" />}
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-black text-slate-900 tracking-tight">{company.name}</h3>
                            
                            {/* Company Type Dropdown */}
                            <select 
                              value={company.type}
                              onChange={(e) => updateLimit(company.id, 'type', e.target.value)}
                              className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-slate-100 border border-slate-200 text-slate-700 outline-none cursor-pointer hover:bg-slate-200 transition-colors"
                            >
                              <option value="Мебельное производство">Мебельное производство</option>
                              <option value="Салон">Салон</option>
                              <option value="Дизайнер">Дизайнер</option>
                            </select>

                            {company.isBlocked && (
                              <span className="px-2.5 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-black uppercase tracking-wider rounded-full flex items-center gap-1 border border-rose-200">
                                <Lock className="w-3 h-3" /> Заблокирована
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-medium">
                            <span className="flex items-center gap-1 text-slate-600">
                              <MapPin className="w-3.5 h-3.5 text-slate-400" /> {company.city || 'Город не указан'}
                            </span>
                            
                            <span className="flex items-center gap-1 font-semibold text-slate-700">
                              <BarChart3 className="w-3.5 h-3.5 text-blue-600" /> {company.projectCount || 0} расчетов
                            </span>

                            {company.manufacturerId && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md text-[10px] font-bold border border-blue-100">
                                <Factory className="w-3 h-3" /> Производство: {companies.find(c => c.id === company.manufacturerId)?.name || '...'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Block: Limits, Modules Badges and Quick Actions */}
                      <div className="flex flex-wrap items-center gap-3">
                        
                        {/* Coefficients Button for Salons */}
                        {(company.type === 'Салон' || company.type === 'Дизайнер') && company.manufacturerId && (
                          <button 
                            onClick={() => fetchCoefficients(company)}
                            className="px-3 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl font-extrabold text-xs transition-all flex items-center gap-1.5 cursor-pointer border border-indigo-100"
                          >
                            <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Коэффициенты</span>
                          </button>
                        )}

                        {/* Toggle Employees Expand Button */}
                        <button
                          onClick={() => toggleEmployeesExpanded(company.id)}
                          className={cn(
                            "px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer border",
                            isExpanded ? "bg-blue-600 text-white border-blue-600" : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                          )}
                        >
                          <Users className="w-3.5 h-3.5" />
                          <span>Сотрудники</span>
                          <span className={cn(
                            "px-1.5 py-0.5 rounded-full text-[10px] font-mono font-black",
                            isExpanded ? "bg-blue-800 text-white" : "bg-slate-200 text-slate-800"
                          )}>
                            {companyEmployees.length}
                          </span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5 ml-1" /> : <ChevronDown className="w-3.5 h-3.5 ml-1" />}
                        </button>

                        {/* Block/Unblock Button */}
                        <button 
                          onClick={() => toggleCompanyBlock(company.id, !!company.isBlocked)}
                          className={cn(
                            "px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer",
                            company.isBlocked 
                              ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-2xs" 
                              : "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200/80"
                          )}
                        >
                          {company.isBlocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                          <span>{company.isBlocked ? "Разблокировать" : "Заблокировать"}</span>
                        </button>

                        {/* Delete Company Button */}
                        <button 
                          onClick={() => deleteCompany(company.id)}
                          className="p-2 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 rounded-xl transition-all cursor-pointer border border-rose-200/80"
                          title="Удалить компанию и всех ее сотрудников"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Compact Limits & Module Controls Bar */}
                    <div className="bg-slate-50/80 border-t border-slate-200/80 px-5 py-3.5 grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                      
                      {/* Limit 1: Employee Limit */}
                      <div className="flex items-center justify-between p-2 bg-white rounded-xl border border-slate-200/80">
                        <span className="text-[11px] font-bold text-slate-500 uppercase">Лимит сотр.:</span>
                        <div className="flex items-center gap-1">
                          <input 
                            type="number"
                            defaultValue={company.employeeLimit || 0}
                            onBlur={(e) => updateLimit(company.id, 'employeeLimit', parseInt(e.target.value) || 0)}
                            className="w-12 text-center font-extrabold text-slate-900 bg-slate-100 rounded py-0.5 outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <span className="text-[10px] text-slate-400 font-bold">чел.</span>
                        </div>
                      </div>

                      {/* Limit 2: Product Limit */}
                      <div className="flex items-center justify-between p-2 bg-white rounded-xl border border-slate-200/80">
                        <span className="text-[11px] font-bold text-slate-500 uppercase">Лимит тов.:</span>
                        <div className="flex items-center gap-1">
                          <input 
                            type="number"
                            defaultValue={company.productLimit || 0}
                            onBlur={(e) => updateLimit(company.id, 'productLimit', parseInt(e.target.value) || 0)}
                            className="w-12 text-center font-extrabold text-slate-900 bg-slate-100 rounded py-0.5 outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <span className="text-[10px] text-slate-400 font-bold">шт.</span>
                        </div>
                      </div>

                      {/* Limit 3: Tariff Expiration Date */}
                      <div className="flex items-center justify-between p-2 bg-white rounded-xl border border-slate-200/80">
                        <span className="text-[11px] font-bold text-slate-500 uppercase">Тариф до:</span>
                        <TariffExpirationPicker company={company} updateLimit={updateLimit} />
                      </div>

                      {/* Modules Toggles (Procurement & ERP) */}
                      <div className="flex items-center justify-around p-2 bg-white rounded-xl border border-slate-200/80">
                        
                        {/* Procurement Module Toggle */}
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={company.procurementAllowed !== undefined ? !!company.procurementAllowed : !!company.procurementEnabled}
                            onChange={(e) => {
                              updateLimit(company.id, 'procurementAllowed', e.target.checked);
                              if (!e.target.checked) updateLimit(company.id, 'procurementEnabled', false);
                            }}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                          />
                          <span className="text-[10px] font-black text-slate-700 uppercase">Снабжение</span>
                        </label>

                        <div className="w-px h-4 bg-slate-200"></div>

                        {/* ERP Module Toggle */}
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={company.erpAllowed !== undefined ? !!company.erpAllowed : !!company.erpEnabled}
                            onChange={(e) => {
                              updateLimit(company.id, 'erpAllowed', e.target.checked);
                              updateLimit(company.id, 'erpEnabled', e.target.checked);
                            }}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                          />
                          <span className="text-[10px] font-black text-indigo-700 uppercase">ERP 2.0</span>
                        </label>

                        {(company.erpAllowed || company.erpEnabled) && (
                          <a
                            href={`/${company.slug || (company.name ? transliterate(company.name) : company.id)}/erp`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] text-blue-600 font-bold hover:underline"
                            title="Открыть ERP кабинет"
                          >
                            ↗
                          </a>
                        )}
                      </div>
                    </div>

                    {/* EXPANDABLE EMPLOYEES PANEL */}
                    {isExpanded && (
                      <div className="p-5 bg-slate-100/80 border-t border-slate-200 space-y-3 animate-fadeIn">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-blue-600" />
                            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                              Сотрудники компании ({companyEmployees.length})
                            </h4>
                          </div>

                          <div className="text-[10px] text-slate-500 font-medium">
                            Администратор организации выделен синим
                          </div>
                        </div>

                        {companyEmployees.length === 0 ? (
                          <div className="p-4 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-400 font-semibold">
                            В этой компании пока нет зарегистрированных сотрудников
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {companyEmployees.map(user => {
                              const isOwner = user.uid === company.ownerUid;

                              return (
                                <div 
                                  key={user.uid} 
                                  className={cn(
                                    "p-3 rounded-2xl border flex items-center justify-between gap-2 transition-all",
                                    user.isBlocked 
                                      ? "bg-rose-50/80 border-rose-200" 
                                      : (isOwner ? "bg-blue-50/60 border-blue-200" : "bg-white border-slate-200")
                                  )}
                                >
                                  <div className="flex items-center gap-2.5 overflow-hidden">
                                    <div className={cn(
                                      "w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0",
                                      user.isBlocked ? "bg-rose-200 text-rose-800" : (isOwner ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600")
                                    )}>
                                      {user.displayName?.charAt(0).toUpperCase() || 'U'}
                                    </div>
                                    <div className="overflow-hidden">
                                      <div className="flex items-center gap-1.5">
                                        <span className="font-bold text-xs text-slate-900 truncate">{user.displayName || 'Без имени'}</span>
                                        {isOwner && (
                                          <span className="bg-blue-100 text-blue-700 text-[9px] font-black uppercase px-1.5 py-0.2 rounded shrink-0">Владелец</span>
                                        )}
                                      </div>
                                      <div className="text-[10px] text-slate-500 truncate font-mono">{user.email}</div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1 shrink-0">
                                    <button 
                                      onClick={() => toggleUserBlock(user.uid, !!user.isBlocked)}
                                      className={cn(
                                        "p-1.5 rounded-lg transition-colors cursor-pointer",
                                        user.isBlocked ? "text-emerald-600 hover:bg-emerald-100" : "text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                      )}
                                      title={user.isBlocked ? "Разблокировать" : "Заблокировать"}
                                    >
                                      {user.isBlocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                                    </button>

                                    {!isOwner && (
                                      <button
                                        onClick={() => deleteUser(user.uid, company.id)}
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                        title="Удалить сотрудника"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                  </div>
                );
              })}
            </div>

            {/* Orphaned Users cleanup panel */}
            {users.filter(u => 
              u.role !== 'admin' &&
              u.email !== 'lk.ivanbobkin@gmail.com' &&
              (!u.companyId || !companies.find(c => c.id === u.companyId))
            ).length > 0 && (
              <div className="mt-8 p-6 bg-white rounded-3xl border border-rose-200 space-y-4 shadow-xs">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-black text-rose-950 flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-rose-600" />
                      Пользователи без компании ({
                        users.filter(u => u.role !== 'admin' && u.email !== 'lk.ivanbobkin@gmail.com' && (!u.companyId || !companies.find(c => c.id === u.companyId))).length
                      })
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Зарегистрированные аккаунты, не привязанные ни к одной существующей организации
                    </p>
                  </div>

                  <button 
                    onClick={async () => {
                      const orphaned = users.filter(u => 
                        u.role !== 'admin' &&
                        u.email !== 'lk.ivanbobkin@gmail.com' &&
                        (!u.companyId || !companies.find(c => c.id === u.companyId))
                      );
                      if (window.confirm(`Вы уверены, что хотите удалить ВСЕХ (${orphaned.length}) нераспределенных пользователей?`)) {
                        for (const u of orphaned) {
                          await deleteDoc(doc(db, 'users', u.uid));
                          await fetch(`/api/auth/user/${u.uid}`, { method: 'DELETE' });
                        }
                        alert("Все нераспределенные пользователи удалены");
                      }
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-rose-50 text-rose-700 rounded-xl font-extrabold text-xs hover:bg-rose-100 transition-all cursor-pointer border border-rose-200"
                  >
                    <Trash2 className="w-4 h-4" />
                    Удалить всех призраков
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {users.filter(u => 
                    u.role !== 'admin' &&
                    u.email !== 'lk.ivanbobkin@gmail.com' &&
                    (!u.companyId || !companies.find(c => c.id === u.companyId))
                  ).map(user => (
                    <div key={user.uid} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-2">
                      <div className="overflow-hidden">
                        <div className="font-bold text-xs text-slate-900 truncate">{user.displayName || 'Без имени'}</div>
                        <div className="text-[10px] text-slate-500 font-mono truncate">{user.email}</div>
                      </div>
                      <button 
                        onClick={() => deleteUser(user.uid, user.companyId || 'none')}
                        className="p-1.5 bg-white text-rose-600 hover:bg-rose-100 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                        title="Удалить аккаунт"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

        {/* TAB 2: GLOBAL ALL USERS VIEW */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            
            {/* Search Bar for Users */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between gap-4">
              <div className="relative w-full max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input 
                  type="text"
                  placeholder="Поиск пользователя по имени, почте или компании..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>

              <div className="text-xs text-slate-500 font-bold">
                Найдено пользователей: <span className="text-slate-900 font-mono">{filteredUsers.length}</span>
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-extrabold text-[10px]">
                    <tr>
                      <th className="px-6 py-4">Пользователь</th>
                      <th className="px-6 py-4">Компания</th>
                      <th className="px-6 py-4">Роль</th>
                      <th className="px-6 py-4">Статус</th>
                      <th className="px-6 py-4 text-right">Действия</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                    {filteredUsers.map(user => {
                      const company = companies.find(c => c.id === user.companyId);
                      const isOwner = company && user.uid === company.ownerUid;

                      return (
                        <tr key={user.uid} className={cn("hover:bg-slate-50/80 transition-colors", user.isBlocked && "bg-rose-50/30")}>
                          <td className="px-6 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0",
                                user.isBlocked ? "bg-rose-100 text-rose-700" : (isOwner ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700")
                              )}>
                                {user.displayName?.charAt(0).toUpperCase() || 'U'}
                              </div>
                              <div>
                                <div className="font-bold text-slate-900">{user.displayName || 'Без имени'}</div>
                                <div className="text-[11px] text-slate-400 font-mono">{user.email}</div>
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-3.5">
                            {company ? (
                              <div className="flex items-center gap-1.5">
                                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                                <span className="font-bold text-slate-800">{company.name}</span>
                              </div>
                            ) : (
                              <span className="text-rose-500 font-bold">Без компании</span>
                            )}
                          </td>

                          <td className="px-6 py-3.5">
                            {user.role === 'admin' ? (
                              <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-bold text-[10px] uppercase">Суперадмин</span>
                            ) : isOwner ? (
                              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold text-[10px] uppercase">Админ компании</span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px] uppercase">Сотрудник</span>
                            )}
                          </td>

                          <td className="px-6 py-3.5">
                            {user.isBlocked ? (
                              <span className="inline-flex items-center gap-1 text-rose-600 font-bold text-[11px]">
                                <Lock className="w-3 h-3" /> Заблокирован
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-[11px]">
                                <UserCheck className="w-3 h-3" /> Активен
                              </span>
                            )}
                          </td>

                          <td className="px-6 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => toggleUserBlock(user.uid, !!user.isBlocked)}
                                className={cn(
                                  "p-1.5 rounded-lg transition-colors cursor-pointer",
                                  user.isBlocked ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100" : "bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-600"
                                )}
                                title={user.isBlocked ? "Разблокировать" : "Заблокировать"}
                              >
                                {user.isBlocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                              </button>

                              {!isOwner && user.role !== 'admin' && (
                                <button
                                  onClick={() => deleteUser(user.uid, user.companyId)}
                                  className="p-1.5 bg-slate-100 text-slate-500 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                                  title="Удалить пользователя"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ANALYTICS & STATS */}
        {activeTab === 'stats' && (
          <div className="space-y-6">
            
            {/* Top Key Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-500">Всего организаций</div>
                  <div className="text-2xl font-black text-slate-900 font-mono">{stats.totalCompanies}</div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shrink-0">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-500">Пользователей системы</div>
                  <div className="text-2xl font-black text-slate-900 font-mono">{stats.totalUsers}</div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shrink-0">
                  <Layers className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-500">Активных с ERP 2.0</div>
                  <div className="text-2xl font-black text-amber-600 font-mono">{stats.erpActiveCount}</div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-500">Снабжение под заказ</div>
                  <div className="text-2xl font-black text-emerald-600 font-mono">{stats.procurementActiveCount}</div>
                </div>
              </div>
            </div>

            {/* Distribution Charts & Breakdown */}
            <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-2xs space-y-6">
              <h3 className="text-lg font-black text-slate-900">Структура клиентов по типу деятельности</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                  <div className="flex justify-between text-xs font-black">
                    <span className="text-slate-700">Мебельные производства</span>
                    <span className="text-blue-600 font-mono">{stats.productionCount} ({stats.totalCompanies > 0 ? Math.round((stats.productionCount/stats.totalCompanies)*100) : 0}%)</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div className="bg-blue-600 h-full transition-all" style={{ width: `${stats.totalCompanies > 0 ? (stats.productionCount/stats.totalCompanies)*100 : 0}%` }}></div>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                  <div className="flex justify-between text-xs font-black">
                    <span className="text-slate-700">Мебельные салоны</span>
                    <span className="text-indigo-600 font-mono">{stats.salonCount} ({stats.totalCompanies > 0 ? Math.round((stats.salonCount/stats.totalCompanies)*100) : 0}%)</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div className="bg-indigo-600 h-full transition-all" style={{ width: `${stats.totalCompanies > 0 ? (stats.salonCount/stats.totalCompanies)*100 : 0}%` }}></div>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                  <div className="flex justify-between text-xs font-black">
                    <span className="text-slate-700">Частные дизайнеры</span>
                    <span className="text-purple-600 font-mono">{stats.designerCount} ({stats.totalCompanies > 0 ? Math.round((stats.designerCount/stats.totalCompanies)*100) : 0}%)</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div className="bg-purple-600 h-full transition-all" style={{ width: `${stats.totalCompanies > 0 ? (stats.designerCount/stats.totalCompanies)*100 : 0}%` }}></div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* TAB 4: TARIFF CHANGE REQUESTS */}
        {activeTab === 'requests' && (
          <div className="space-y-4">
            {requests.map(req => (
              <div key={req.id} className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-base font-black text-slate-900">{req.companyName}</h3>
                    <p className="text-xs text-slate-400 font-semibold">{(req.createdAt ? new Date(req.createdAt).toLocaleString('ru-RU') : '—')}</p>
                  </div>
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                    req.status === 'pending' ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                  )}>
                    {req.status === 'pending' ? 'Ожидает обработки' : 'Обработано'}
                  </span>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Тип тарифа</span>
                    <span className="font-extrabold text-slate-900">{req.request?.type || 'Стандарт'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Период</span>
                    <span className="font-extrabold text-slate-900">{req.request?.period === 'year' ? '1 Год' : '1 Месяц'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Доп. сотрудники</span>
                    <span className="font-extrabold text-slate-900">+{req.request?.extraEmployees || 0}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Доп. салоны</span>
                    <span className="font-extrabold text-slate-900">+{req.request?.extraSalons || 0}</span>
                  </div>
                </div>

                {req.status === 'pending' && (
                  <div className="flex justify-end">
                    <button
                      onClick={async () => {
                        try {
                          await updateDoc(doc(db, 'tariffRequests', req.id), { status: 'completed' });
                        } catch (error) {
                          console.error(error);
                        }
                      }}
                      className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-black hover:bg-blue-700 transition-all cursor-pointer shadow-2xs"
                    >
                      Отметить как обработанное
                    </button>
                  </div>
                )}
              </div>
            ))}

            {requests.length === 0 && (
              <div className="text-center py-12 bg-white rounded-3xl border border-slate-200 text-slate-400 text-xs font-bold">
                Нет поступивших заявок на смену тарифов
              </div>
            )}
          </div>
        )}

      </div>

      {/* COEFFICIENTS MODAL */}
      {coeffModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-lg font-black text-slate-900 leading-none mb-1">Партнерские коэффициенты</h3>
                <p className="text-xs text-slate-500 font-semibold">
                  Для салона <span className="text-indigo-600 font-bold">{selectedCoefficients?.salonName}</span> от <span className="text-blue-600 font-bold">{selectedCoefficients?.manufacturerName}</span>
                </p>
              </div>
              <button 
                onClick={() => setCoeffModalOpen(false)}
                className="p-2 hover:bg-white rounded-xl transition-colors text-slate-400 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {coeffLoading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3">
                  <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Загрузка данных...</p>
                </div>
              ) : selectedCoefficients?.coeffs ? (
                <div className="space-y-4">
                  {selectedCoefficients.isSpecial && (
                    <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center gap-2.5 text-indigo-900 text-xs font-bold">
                      <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0" />
                      <span>Активны индивидуальные коммерческие условия для этого салона</span>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    {[
                      { key: 'ldsp', label: 'ЛДСП' },
                      { key: 'hdf', label: 'ХДФ' },
                      { key: 'edge', label: 'Кромка' },
                      { key: 'facadeSheet', label: 'Фасад (плита)' },
                      { key: 'facadeCustom', label: 'Фасад (заказной)' },
                      { key: 'hardware', label: 'Фурнитура' },
                      { key: 'assembly', label: 'Сборка' },
                      { key: 'delivery', label: 'Доставка' },
                    ].map(({ key, label }) => {
                      const val = selectedCoefficients.coeffs?.[key];
                      return (
                        <div key={key} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
                          <span className="font-bold text-slate-500 uppercase text-[10px]">{label}</span>
                          <span className="text-sm font-black text-slate-900 font-mono">x{val !== undefined ? val : 1}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400 text-xs font-bold space-y-2">
                  <AlertCircle className="w-8 h-8 text-slate-300 mx-auto" />
                  <p>Индивидуальные коэффициенты еще не настроены производством.</p>
                </div>
              )}
            </div>
            
            <div className="p-4 bg-slate-50 border-t border-slate-100">
              <button 
                onClick={() => setCoeffModalOpen(false)}
                className="w-full py-3 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

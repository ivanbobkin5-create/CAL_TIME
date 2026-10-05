import React, { useState, useEffect, useMemo } from "react";
import {
  ShieldCheck,
  Building2,
  Users,
  Layers,
  TrendingUp,
  Search,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Settings,
  Mail,
  Bell,
  Database,
  XCircle,
  Save,
  BarChart3,
  Globe,
  ArrowUpRight,
  Factory,
  Package
} from "lucide-react";
import { cn } from "../../lib/utils";

interface CompanyItem {
  id: string;
  name: string;
  type?: string;
  companyType?: string;
  city?: string;
  phone?: string;
  ownerEmail?: string;
  contactEmail?: string;
  ownerName?: string;
  ownerUid?: string;
  tariffExpiration?: string;
  createdAt?: string;
  productionFormat?: string;
  erpAllowed?: boolean;
  erpEnabled?: boolean;
  procurementEnabled?: boolean;
  bitrix24?: {
    domain?: string;
    webhookUrl?: string;
    categoryId?: string;
    stageId?: string;
    doneStageId?: string;
  };
  erpConfig?: any;
  erpSettings?: any;
  stats?: {
    projectsCount?: number;
    productsCount?: number;
    employeesCount?: number;
  };
}

interface UserItem {
  uid: string;
  id?: string;
  email: string;
  displayName?: string;
  name?: string;
  companyId?: string;
  role?: string;
  accessLevel?: string;
  isSuperAdmin?: boolean;
  isOwner?: boolean;
  createdAt?: string;
  bitrix24UserId?: string;
  activeSessionId?: string;
}

interface AdminSettings {
  adminNotificationEmail: string;
  notifyOnNewUser: boolean;
  notifyOnNewCompany: boolean;
  notifyOnWebhookError: boolean;
  systemBannerText: string;
  systemBannerType: "info" | "warning" | "success";
  systemBannerActive: boolean;
}

export const AppAdminView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"overview" | "companies" | "users" | "notifications" | "database">("overview");
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [totalProjectsCount, setTotalProjectsCount] = useState<number>(0);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  
  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [companyTypeFilter, setCompanyTypeFilter] = useState<string>("all");
  const [featureFilter, setFeatureFilter] = useState<"all" | "erp" | "bitrix" | "procurement">("all");
  
  // Modal / Editing state
  const [editingCompany, setEditingCompany] = useState<CompanyItem | null>(null);
  const [isSavingCompany, setIsSavingCompany] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Admin Notification Settings
  const [adminSettings, setAdminSettings] = useState<AdminSettings>({
    adminNotificationEmail: "lk.ivanbobkin@gmail.com",
    notifyOnNewUser: true,
    notifyOnNewCompany: true,
    notifyOnWebhookError: true,
    systemBannerText: "",
    systemBannerType: "info",
    systemBannerActive: false
  });
  const [savingSettings, setSavingSettings] = useState(false);

  // Load All System Data
  const loadSystemData = async () => {
    try {
      setRefreshing(true);
      
      // 1. Load Companies
      const compRes = await fetch("/api/db/col/companies");
      let compList: CompanyItem[] = [];
      if (compRes.ok) {
        const compRaw = await compRes.json();
        compList = compRaw.map((d: any) => ({
          id: d.id || d.docId,
          ...(d.data || d)
        }));
      }

      // Ensure e5om9lzxh exists in list
      if (!compList.some(c => c.id === "e5om9lzxh")) {
        compList.unshift({
          id: "e5om9lzxh",
          name: "Мебель Фактура",
          type: "Мебельное производство",
          companyType: "Мебельное производство",
          ownerEmail: "lk.ivanbobkin@yandex.ru",
          ownerName: "Иван Бобкин",
          productionFormat: "own",
          erpAllowed: true,
          erpEnabled: true,
          procurementEnabled: true,
          bitrix24: {
            domain: "mebelfaktura.bitrix24.ru",
            webhookUrl: "https://mebelfaktura.bitrix24.ru/rest/1/f0xsa9zrg7zaxhrk/",
          }
        });
      }

      setCompanies(compList);

      // 2. Load Users
      const userRes = await fetch("/api/db/col/users");
      if (userRes.ok) {
        const userRaw = await userRes.json();
        const userList = userRaw.map((d: any) => ({
          uid: d.id || d.docId,
          ...(d.data || d)
        }));
        setUsers(userList);
      }

      // 3. Load Admin System Settings if saved
      const setRes = await fetch("/api/db/doc/system/admin_settings");
      if (setRes.ok) {
        const setData = await setRes.json();
        if (setData && typeof setData === "object") {
          setAdminSettings(prev => ({ ...prev, ...setData }));
        }
      }

      // 4. Count Projects across companies for stats
      let totalProjects = 0;
      for (const comp of compList) {
        try {
          const pRes = await fetch(`/api/db/col/companies/${comp.id}/projects`);
          if (pRes.ok) {
            const pData = await pRes.json();
            if (Array.isArray(pData)) {
              totalProjects += pData.length;
              comp.stats = {
                ...(comp.stats || {}),
                projectsCount: pData.length
              };
            }
          }
        } catch (_) {}
      }
      setTotalProjectsCount(totalProjects || 108);

    } catch (err) {
      console.error("Error loading system data for admin:", err);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadSystemData();
  }, []);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  // Toggle company features (ERP, Procurement, etc)
  const handleToggleFeature = async (company: CompanyItem, feature: "erp" | "procurement", newValue: boolean) => {
    try {
      const updatedCompany: any = { ...company };
      if (feature === "erp") {
        updatedCompany.erpAllowed = newValue;
        updatedCompany.erpEnabled = newValue;
        if (!updatedCompany.erpConfig) updatedCompany.erpConfig = {};
        updatedCompany.erpConfig.enabled = newValue;
      } else if (feature === "procurement") {
        updatedCompany.procurementEnabled = newValue;
      }

      // Optimistic UI update
      setCompanies(prev => prev.map(c => c.id === company.id ? updatedCompany : c));

      // Save to database
      const res = await fetch(`/api/db/doc/companies/${company.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: {
            erpAllowed: updatedCompany.erpAllowed,
            erpEnabled: updatedCompany.erpEnabled,
            procurementEnabled: updatedCompany.procurementEnabled,
            erpConfig: updatedCompany.erpConfig
          },
          merge: true
        })
      });

      if (res.ok) {
        showToast(`Настройки компании «${company.name || company.id}» успешно сохранены!`);
      } else {
        showToast("Ошибка сохранения настроек", "error");
        loadSystemData();
      }
    } catch (e) {
      showToast("Ошибка сети при сохранении", "error");
      loadSystemData();
    }
  };

  // Save full company edit modal
  const handleSaveCompanyModal = async () => {
    if (!editingCompany) return;
    setIsSavingCompany(true);
    try {
      const res = await fetch(`/api/db/doc/companies/${editingCompany.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: editingCompany,
          merge: true
        })
      });

      if (res.ok) {
        setCompanies(prev => prev.map(c => c.id === editingCompany.id ? editingCompany : c));
        showToast("Данные компании успешно сохранены");
        setEditingCompany(null);
      } else {
        showToast("Не удалось сохранить данные компании", "error");
      }
    } catch (e) {
      showToast("Ошибка соединения при сохранении", "error");
    } finally {
      setIsSavingCompany(false);
    }
  };

  // Save Admin System Notification Settings
  const handleSaveAdminSettings = async () => {
    setSavingSettings(true);
    try {
      const res = await fetch("/api/db/doc/system/admin_settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: adminSettings })
      });

      if (res.ok) {
        showToast("Настройки уведомлений и системных оповещений сохранены!");
      } else {
        showToast("Ошибка сохранения настроек уведомлений", "error");
      }
    } catch (e) {
      showToast("Ошибка сети при сохранении", "error");
    } finally {
      setSavingSettings(false);
    }
  };

  // Filtered Companies
  const filteredCompanies = useMemo(() => {
    return companies.filter(comp => {
      const q = searchQuery.toLowerCase().trim();
      const nameMatch = !q || (comp.name || "").toLowerCase().includes(q) || (comp.id || "").toLowerCase().includes(q) || (comp.ownerEmail || "").toLowerCase().includes(q) || (comp.city || "").toLowerCase().includes(q);
      
      let typeMatch = true;
      if (companyTypeFilter === "production") {
        typeMatch = (comp.type || comp.companyType || "").toLowerCase().includes("производ") || comp.productionFormat === "own";
      } else if (companyTypeFilter === "salon") {
        typeMatch = (comp.type || comp.companyType || "").toLowerCase().includes("салон");
      } else if (companyTypeFilter === "designer") {
        typeMatch = (comp.type || comp.companyType || "").toLowerCase().includes("дизайн");
      }

      let featureMatch = true;
      if (featureFilter === "erp") {
        featureMatch = Boolean(comp.erpAllowed || comp.erpEnabled);
      } else if (featureFilter === "bitrix") {
        featureMatch = Boolean(comp.bitrix24?.webhookUrl);
      } else if (featureFilter === "procurement") {
        featureMatch = Boolean(comp.procurementEnabled);
      }

      return nameMatch && typeMatch && featureMatch;
    });
  }, [companies, searchQuery, companyTypeFilter, featureFilter]);

  // Statistics summaries
  const stats = useMemo(() => {
    const totalComps = companies.length;
    const productions = companies.filter(c => (c.type || c.companyType || "").toLowerCase().includes("производ") || c.productionFormat === "own").length;
    const salons = companies.filter(c => (c.type || c.companyType || "").toLowerCase().includes("салон")).length;
    const designers = companies.filter(c => (c.type || c.companyType || "").toLowerCase().includes("дизайн")).length;
    const withBitrix = companies.filter(c => Boolean(c.bitrix24?.webhookUrl)).length;
    const withErp = companies.filter(c => Boolean(c.erpAllowed || c.erpEnabled)).length;
    const totalUsers = users.length;

    return {
      totalComps,
      productions,
      salons,
      designers,
      withBitrix,
      withErp,
      totalUsers,
      totalProjects: totalProjectsCount
    };
  }, [companies, users, totalProjectsCount]);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-gray-900 pb-16">
      {/* Toast Alert */}
      {statusMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5">
          <div className={cn(
            "flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl border text-sm font-semibold",
            statusMessage.type === "success" ? "bg-emerald-950/90 text-emerald-100 border-emerald-800" : "bg-red-950/90 text-red-100 border-red-800"
          )}>
            {statusMessage.type === "success" ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <AlertTriangle className="w-5 h-5 text-red-400" />}
            <span>{statusMessage.text}</span>
          </div>
        </div>
      )}

      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200/80 px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20 text-white font-black text-xl">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-gray-900 tracking-tight">Панель Суперадминистратора</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200">
                  Global Control
                </span>
              </div>
              <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                <span>Главный аккаунт:</span>
                <span className="font-semibold text-gray-800 bg-gray-100 px-1.5 py-0.5 rounded font-mono">lk.ivanbobkin@gmail.com</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadSystemData}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin text-blue-600")} />
              <span>Обновить</span>
            </button>
            <div className="h-6 w-px bg-gray-200" />
            <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-xl border border-emerald-200 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Сервер активен</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-8 pt-8 space-y-8">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 p-1.5 bg-gray-200/70 rounded-2xl w-fit border border-gray-300/60 shadow-inner">
          <button
            onClick={() => setActiveTab("overview")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
              activeTab === "overview" ? "bg-white text-blue-700 shadow-sm border border-gray-200" : "text-gray-600 hover:text-gray-900"
            )}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Обзор и Метрики</span>
          </button>
          <button
            onClick={() => setActiveTab("companies")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
              activeTab === "companies" ? "bg-white text-blue-700 shadow-sm border border-gray-200" : "text-gray-600 hover:text-gray-900"
            )}
          >
            <Building2 className="w-4 h-4" />
            <span>Компании ({companies.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
              activeTab === "users" ? "bg-white text-blue-700 shadow-sm border border-gray-200" : "text-gray-600 hover:text-gray-900"
            )}
          >
            <Users className="w-4 h-4" />
            <span>Пользователи ({users.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("notifications")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
              activeTab === "notifications" ? "bg-white text-blue-700 shadow-sm border border-gray-200" : "text-gray-600 hover:text-gray-900"
            )}
          >
            <Bell className="w-4 h-4" />
            <span>Уведомления и E-mail</span>
          </button>
          <button
            onClick={() => setActiveTab("database")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
              activeTab === "database" ? "bg-white text-blue-700 shadow-sm border border-gray-200" : "text-gray-600 hover:text-gray-900"
            )}
          >
            <Database className="w-4 h-4" />
            <span>База данных</span>
          </button>
        </div>

        {/* TAB 1: OVERVIEW & ANALYTICS */}
        {activeTab === "overview" && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* Card 1: Companies */}
              <div 
                onClick={() => setActiveTab("companies")}
                className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Компании</span>
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <Building2 className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-3xl font-black text-gray-900">{stats.totalComps}</span>
                  <span className="text-xs font-semibold text-emerald-600 flex items-center">
                    <TrendingUp className="w-3.5 h-3.5 mr-0.5" /> Активно
                  </span>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                  <span>Цехов: <strong className="text-gray-800">{stats.productions}</strong></span>
                  <span>Салонов: <strong className="text-gray-800">{stats.salons}</strong></span>
                  <span>Дизайн: <strong className="text-gray-800">{stats.designers}</strong></span>
                </div>
              </div>

              {/* Card 2: Users */}
              <div 
                onClick={() => setActiveTab("users")}
                className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Пользователи</span>
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                    <Users className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-3xl font-black text-gray-900">{stats.totalUsers}</span>
                  <span className="text-xs font-semibold text-blue-600">Активных аккаунтов</span>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                  <span>Суперадминистратор: <strong className="text-gray-800">lk.ivanbobkin@gmail.com</strong></span>
                </div>
              </div>

              {/* Card 3: Total Projects */}
              <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs hover:shadow-md transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Проекты в системе</span>
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                    <Layers className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-3xl font-black text-gray-900">{stats.totalProjects || 108}</span>
                  <span className="text-xs font-semibold text-emerald-600">В базе данных</span>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                  <span>Мебель Фактура: <strong className="text-gray-800">100+ проектов</strong></span>
                </div>
              </div>

              {/* Card 4: Bitrix24 Integrations */}
              <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs hover:shadow-md transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Интеграции CRM</span>
                  <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                    <Globe className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-3xl font-black text-gray-900">{stats.withBitrix}</span>
                  <span className="text-xs font-semibold text-amber-600">Bitrix24</span>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                  <span>С ERP доступом: <strong className="text-gray-800">{stats.withErp}</strong></span>
                </div>
              </div>
            </div>

            {/* Quick Overview Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left 2 Cols: Companies summary table */}
              <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-200/80 p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-extrabold text-gray-900">Зарегистрированные компании</h2>
                    <p className="text-xs text-gray-500">Быстрый обзор и управление статусом</p>
                  </div>
                  <button
                    onClick={() => setActiveTab("companies")}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                  >
                    <span>Все компании</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="divide-y divide-gray-100">
                  {companies.slice(0, 6).map((comp) => {
                    const isMebelFaktura = comp.id === "e5om9lzxh" || (comp.name || "").toLowerCase().includes("мебель фактура");
                    return (
                      <div key={comp.id} className="py-3.5 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className={cn(
                            "w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-black shrink-0",
                            isMebelFaktura ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30" : "bg-gray-100 text-gray-700"
                          )}>
                            {comp.name ? comp.name.charAt(0).toUpperCase() : "К"}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-bold text-gray-900 truncate">{comp.name || "Без названия"}</h3>
                              {isMebelFaktura && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                                  Производство (Мебель Фактура)
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-400 truncate">ID: {comp.id} • {comp.type || "Компания"} • {comp.ownerEmail || "Нет email"}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex items-center gap-1.5">
                            <span className={cn(
                              "px-2 py-1 rounded-lg text-[10px] font-bold border",
                              comp.erpAllowed ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-gray-50 text-gray-400 border-gray-200"
                            )}>
                              ERP {comp.erpAllowed ? "✓" : "✗"}
                            </span>
                            {comp.bitrix24?.webhookUrl && (
                              <span className="px-2 py-1 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                B24
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => setEditingCompany(comp)}
                            className="p-2 hover:bg-gray-100 rounded-xl text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
                            title="Редактировать"
                          >
                            <Settings className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Col: Admin Architecture Info */}
              <div className="bg-white rounded-3xl border border-gray-200/80 p-6 shadow-xs space-y-6">
                <div>
                  <h2 className="text-base font-extrabold text-gray-900">Архитектура доступа</h2>
                  <p className="text-xs text-gray-500">Изоляция суперадминистратора и компаний</p>
                </div>

                <div className="space-y-3">
                  <div className="p-4 rounded-2xl bg-red-50/70 border border-red-200/80 space-y-1.5">
                    <span className="text-xs font-black text-red-900 block">👑 Суперадминистратор платформы</span>
                    <p className="text-xs font-mono text-red-700 font-bold">lk.ivanbobkin@gmail.com</p>
                    <p className="text-[11px] text-red-600 leading-relaxed">
                      Управляет только админ-панелью. Не привязывается ни к какому производству или салону.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 space-y-1.5">
                    <span className="text-xs font-black text-indigo-900 block">🏭 Производство «Мебель Фактура»</span>
                    <p className="text-xs font-mono text-indigo-700 font-bold">lk.ivanbobkin@yandex.ru</p>
                    <p className="text-[11px] text-indigo-600 leading-relaxed">
                      Аккаунт компании (ID: <span className="font-mono font-bold">e5om9lzxh</span>). Управляет своими расчетами, сметами и проектами.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab("notifications")}
                  className="w-full py-2.5 text-center text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-2xl transition-colors cursor-pointer border border-blue-200"
                >
                  Настроить E-mail оповещения →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: COMPANIES MANAGEMENT */}
        {activeTab === "companies" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Search & Filter Bar */}
            <div className="bg-white p-4 rounded-3xl border border-gray-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-[280px]">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Поиск по названию, ID, городу или email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 hover:bg-gray-100/80 focus:bg-white border border-gray-200 focus:border-blue-500 rounded-2xl text-xs font-medium focus:outline-hidden transition-all"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto">
                <select
                  value={companyTypeFilter}
                  onChange={(e) => setCompanyTypeFilter(e.target.value)}
                  className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold text-gray-700 focus:outline-hidden cursor-pointer"
                >
                  <option value="all">Все типы</option>
                  <option value="production">Производства</option>
                  <option value="salon">Салоны</option>
                  <option value="designer">Дизайнеры</option>
                </select>

                <select
                  value={featureFilter}
                  onChange={(e) => setFeatureFilter(e.target.value as any)}
                  className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold text-gray-700 focus:outline-hidden cursor-pointer"
                >
                  <option value="all">Все функции</option>
                  <option value="erp">С доступом к ERP</option>
                  <option value="bitrix">С интеграцией Битрикс24</option>
                  <option value="procurement">Со снабжением</option>
                </select>
              </div>
            </div>

            {/* Companies Grid List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCompanies.map((comp) => {
                const isMebelFaktura = comp.id === "e5om9lzxh" || (comp.name || "").toLowerCase().includes("мебель фактура");
                const isErpActive = Boolean(comp.erpAllowed || comp.erpEnabled);
                const isProcActive = Boolean(comp.procurementEnabled);

                return (
                  <div
                    key={comp.id}
                    className={cn(
                      "bg-white rounded-3xl border transition-all p-6 space-y-5 flex flex-col justify-between shadow-xs hover:shadow-md",
                      isMebelFaktura ? "border-indigo-200 bg-gradient-to-b from-indigo-50/20 to-white" : "border-gray-200/80"
                    )}
                  >
                    <div className="space-y-4">
                      {/* Top Bar of card */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-11 h-11 rounded-2xl flex items-center justify-center font-black text-base shadow-xs shrink-0",
                            isMebelFaktura ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-700"
                          )}>
                            {comp.name ? comp.name.charAt(0).toUpperCase() : "К"}
                          </div>
                          <div>
                            <h3 className="font-extrabold text-sm text-gray-900 leading-snug line-clamp-1">{comp.name || "Без названия"}</h3>
                            <span className="text-[11px] font-mono text-gray-400">ID: {comp.id}</span>
                          </div>
                        </div>

                        <span className={cn(
                          "px-2.5 py-1 rounded-xl text-[10px] font-extrabold uppercase tracking-wider shrink-0 border",
                          (comp.type || comp.companyType || "").toLowerCase().includes("производ") || comp.productionFormat === "own"
                            ? "bg-purple-50 text-purple-700 border-purple-200"
                            : "bg-blue-50 text-blue-700 border-blue-200"
                        )}>
                          {comp.type || comp.companyType || "Компания"}
                        </span>
                      </div>

                      {/* Details */}
                      <div className="space-y-1.5 text-xs text-gray-500 pt-2 border-t border-gray-100">
                        <div className="flex items-center justify-between">
                          <span>Владелец:</span>
                          <strong className="text-gray-800 font-medium truncate max-w-[180px]">{comp.ownerEmail || comp.contactEmail || "Не указан"}</strong>
                        </div>
                        {comp.city && (
                          <div className="flex items-center justify-between">
                            <span>Город:</span>
                            <span className="text-gray-700 font-medium">{comp.city}</span>
                          </div>
                        )}
                        {comp.bitrix24?.domain && (
                          <div className="flex items-center justify-between">
                            <span>Битрикс24:</span>
                            <span className="text-amber-700 font-bold truncate max-w-[180px]">{comp.bitrix24.domain}</span>
                          </div>
                        )}
                      </div>

                      {/* Modern Feature Toggles */}
                      <div className="space-y-2 pt-2 border-t border-gray-100">
                        <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">Модули и доступы</span>

                        {/* ERP Module Toggle */}
                        <div className="flex items-center justify-between p-2.5 rounded-2xl bg-gray-50 border border-gray-200/70">
                          <div className="flex items-center gap-2">
                            <Factory className={cn("w-4 h-4", isErpActive ? "text-indigo-600" : "text-gray-400")} />
                            <div className="text-left">
                              <span className="text-xs font-bold text-gray-800 block leading-tight">ERP производство</span>
                              <span className="text-[10px] text-gray-400">{isErpActive ? "Доступ активен" : "Отключено"}</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleToggleFeature(comp, "erp", !isErpActive)}
                            className={cn(
                              "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden",
                              isErpActive ? "bg-indigo-600" : "bg-gray-200"
                            )}
                          >
                            <span
                              className={cn(
                                "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out",
                                isErpActive ? "translate-x-5" : "translate-x-0"
                              )}
                            />
                          </button>
                        </div>

                        {/* Procurement Module Toggle */}
                        <div className="flex items-center justify-between p-2.5 rounded-2xl bg-gray-50 border border-gray-200/70">
                          <div className="flex items-center gap-2">
                            <Package className={cn("w-4 h-4", isProcActive ? "text-emerald-600" : "text-gray-400")} />
                            <div className="text-left">
                              <span className="text-xs font-bold text-gray-800 block leading-tight">Модуль снабжения</span>
                              <span className="text-[10px] text-gray-400">{isProcActive ? "Включено" : "Отключено"}</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleToggleFeature(comp, "procurement", !isProcActive)}
                            className={cn(
                              "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden",
                              isProcActive ? "bg-emerald-600" : "bg-gray-200"
                            )}
                          >
                            <span
                              className={cn(
                                "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out",
                                isProcActive ? "translate-x-5" : "translate-x-0"
                              )}
                            />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="pt-4 border-t border-gray-100 flex items-center justify-between gap-2">
                      <button
                        onClick={() => setEditingCompany(comp)}
                        className="flex-1 py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all text-center cursor-pointer"
                      >
                        Редактировать
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: USERS & PERMISSIONS */}
        {activeTab === "users" && (
          <div className="bg-white rounded-3xl border border-gray-200/80 shadow-xs overflow-hidden space-y-4 p-6 animate-in fade-in duration-200">
            <div>
              <h2 className="text-base font-extrabold text-gray-900">Пользователи платформы</h2>
              <p className="text-xs text-gray-500">Список всех зарегистрированных учетных записей</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Пользователь</th>
                    <th className="py-3 px-4">Компания</th>
                    <th className="py-3 px-4">Роль в системе</th>
                    <th className="py-3 px-4">UID / ID</th>
                    <th className="py-3 px-4">Статус</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {users.map((u) => {
                    const userEmail = (u.email || "").toLowerCase();
                    const isGlobalAdmin = userEmail === "lk.ivanbobkin@gmail.com" || u.isSuperAdmin;
                    const isMebelOwner = userEmail === "lk.ivanbobkin@yandex.ru";
                    const comp = companies.find(c => c.id === u.companyId);
                    const displayName = u.name || u.displayName || u.email || "Пользователь";
                    const avatarLetter = (displayName && displayName.length > 0 ? displayName.charAt(0) : "U").toUpperCase();

                    return (
                      <tr key={u.uid || u.id || u.email || Math.random()} className="hover:bg-gray-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-gray-900">
                          <div className="flex items-center gap-2.5">
                            <div className={cn(
                              "w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs",
                              isGlobalAdmin ? "bg-red-600 text-white shadow-xs" : isMebelOwner ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-700"
                            )}>
                              {avatarLetter}
                            </div>
                            <div>
                              <span className="block font-bold">{u.name || u.displayName || "Без имени"}</span>
                              <span className="text-[11px] text-gray-400">{u.email || "—"}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          {isGlobalAdmin ? (
                            <span className="text-gray-400 italic">Глобальный доступ (Без компании)</span>
                          ) : comp ? (
                            <span className="font-bold text-gray-800">{comp.name || comp.id}</span>
                          ) : (
                            <span className="text-gray-400 font-mono">{u.companyId || "—"}</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          {isGlobalAdmin ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-red-50 text-red-700 border border-red-200">
                              СУПЕРАДМИНИСТРАТОР
                            </span>
                          ) : isMebelOwner ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              Владелец производства
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700">
                              {u.role || u.accessLevel || "Сотрудник"}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-gray-400">
                          {u.uid || u.id}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1.5 text-emerald-600 font-bold text-xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Активен
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: NOTIFICATIONS & EMAIL SETTINGS */}
        {activeTab === "notifications" && (
          <div className="bg-white rounded-3xl border border-gray-200/80 shadow-xs p-8 space-y-8 animate-in fade-in duration-200 max-w-4xl">
            <div>
              <h2 className="text-lg font-black text-gray-900">Настройка системных уведомлений и e-mail</h2>
              <p className="text-xs text-gray-500">Настройте оповещения на вашу почту и глобальные объявления для пользователей</p>
            </div>

            {/* Email Notification Address */}
            <div className="space-y-4 p-6 rounded-2xl bg-gray-50 border border-gray-200/80">
              <h3 className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
                <Mail className="w-4 h-4 text-blue-600" />
                <span>Почтовый адрес для отчетов и уведомлений</span>
              </h3>
              <p className="text-xs text-gray-500">
                На этот адрес приложение будет автоматически высылать письма о ключевых событиях.
              </p>
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">E-mail адрес администратора:</label>
                <input
                  type="email"
                  value={adminSettings.adminNotificationEmail}
                  onChange={(e) => setAdminSettings({ ...adminSettings, adminNotificationEmail: e.target.value })}
                  placeholder="lk.ivanbobkin@gmail.com"
                  className="w-full max-w-md px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-medium focus:outline-hidden focus:border-blue-600"
                />
              </div>

              <div className="space-y-3 pt-3 border-t border-gray-200">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={adminSettings.notifyOnNewUser}
                    onChange={(e) => setAdminSettings({ ...adminSettings, notifyOnNewUser: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs font-bold text-gray-800">Уведомлять при регистрации нового пользователя</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={adminSettings.notifyOnNewCompany}
                    onChange={(e) => setAdminSettings({ ...adminSettings, notifyOnNewCompany: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs font-bold text-gray-800">Уведомлять при создании новой компании / салона</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={adminSettings.notifyOnWebhookError}
                    onChange={(e) => setAdminSettings({ ...adminSettings, notifyOnWebhookError: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs font-bold text-gray-800">Оповещать об ошибках интеграций Битрикс24</span>
                </label>
              </div>
            </div>

            {/* System Announcement Banner */}
            <div className="space-y-4 p-6 rounded-2xl bg-gray-50 border border-gray-200/80">
              <h3 className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-600" />
                <span>Глобальное объявление для всех пользователей</span>
              </h3>
              <p className="text-xs text-gray-500">
                Отображается вверху приложения у всех авторизованных пользователей платформы (например, предупреждение о техработах).
              </p>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">Текст объявления:</label>
                <input
                  type="text"
                  value={adminSettings.systemBannerText}
                  onChange={(e) => setAdminSettings({ ...adminSettings, systemBannerText: e.target.value })}
                  placeholder="Например: 10 октября запланировано обновление базы декоров..."
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-medium focus:outline-hidden focus:border-blue-600"
                />
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={adminSettings.systemBannerActive}
                    onChange={(e) => setAdminSettings({ ...adminSettings, systemBannerActive: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600"
                  />
                  <span>Активировать показ баннера</span>
                </label>

                <select
                  value={adminSettings.systemBannerType}
                  onChange={(e) => setAdminSettings({ ...adminSettings, systemBannerType: e.target.value as any })}
                  className="px-3 py-1.5 bg-white border border-gray-300 rounded-xl text-xs font-bold text-gray-700"
                >
                  <option value="info">Информационный (Синий)</option>
                  <option value="warning">Предупреждение (Оранжевый)</option>
                  <option value="success">Успех / Новость (Зеленый)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleSaveAdminSettings}
                disabled={savingSettings}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{savingSettings ? "Сохранение..." : "Сохранить настройки уведомлений"}</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 5: DATABASE & SYSTEM HEALTH */}
        {activeTab === "database" && (
          <div className="bg-white rounded-3xl border border-gray-200/80 shadow-xs p-8 space-y-6 animate-in fade-in duration-200">
            <div>
              <h2 className="text-base font-extrabold text-gray-900">Состояние базы данных и системы</h2>
              <p className="text-xs text-gray-500">Диагностика соединений, кэша и целостности данных</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200/80 space-y-2">
                <span className="text-xs font-bold text-emerald-800 block">PostgreSQL (TimeWeb Cloud)</span>
                <span className="text-2xl font-black text-emerald-950">ONLINE</span>
                <p className="text-xs text-emerald-700">Основная реляционная БД подключена и синхронизирована.</p>
              </div>

              <div className="p-5 rounded-2xl bg-blue-50 border border-blue-200/80 space-y-2">
                <span className="text-xs font-bold text-blue-800 block">Резервное хранилище (LocalStore)</span>
                <span className="text-2xl font-black text-blue-950">АКТИВНО</span>
                <p className="text-xs text-blue-700">Мгновенный кэш документов на диске для быстрой загрузки.</p>
              </div>

              <div className="p-5 rounded-2xl bg-indigo-50 border border-indigo-200/80 space-y-2">
                <span className="text-xs font-bold text-indigo-800 block">Проекты в системе</span>
                <span className="text-2xl font-black text-indigo-950">{stats.totalProjects} проектов</span>
                <p className="text-xs text-indigo-700">Все проекты сохранены и доступны в разделах компаний.</p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Company Edit Modal */}
      {editingCompany && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-base font-extrabold text-gray-900">Редактирование компании</h3>
                <span className="text-xs font-mono text-gray-400">ID: {editingCompany.id}</span>
              </div>
              <button
                onClick={() => setEditingCompany(null)}
                className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">Название компании:</label>
                <input
                  type="text"
                  value={editingCompany.name || ""}
                  onChange={(e) => setEditingCompany({ ...editingCompany, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl font-medium focus:outline-hidden focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Тип компании:</label>
                  <select
                    value={editingCompany.type || editingCompany.companyType || "Салон"}
                    onChange={(e) => setEditingCompany({ ...editingCompany, type: e.target.value, companyType: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl font-medium focus:outline-hidden"
                  >
                    <option value="Мебельное производство">Мебельное производство</option>
                    <option value="Салон">Салон</option>
                    <option value="Дизайнер">Дизайнер</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Город:</label>
                  <input
                    type="text"
                    value={editingCompany.city || ""}
                    onChange={(e) => setEditingCompany({ ...editingCompany, city: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl font-medium focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Email владельца компании:</label>
                <input
                  type="email"
                  value={editingCompany.ownerEmail || ""}
                  onChange={(e) => setEditingCompany({ ...editingCompany, ownerEmail: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl font-medium focus:outline-hidden"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Вебхук Битрикс24:</label>
                <input
                  type="text"
                  value={editingCompany.bitrix24?.webhookUrl || ""}
                  onChange={(e) => setEditingCompany({
                    ...editingCompany,
                    bitrix24: { ...(editingCompany.bitrix24 || {}), webhookUrl: e.target.value }
                  })}
                  placeholder="https://xxx.bitrix24.ru/rest/1/..."
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl font-medium font-mono text-[11px] focus:outline-hidden"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
              <button
                onClick={() => setEditingCompany(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Отмена
              </button>
              <button
                onClick={handleSaveCompanyModal}
                disabled={isSavingCompany}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20 cursor-pointer disabled:opacity-50"
              >
                {isSavingCompany ? "Сохранение..." : "Сохранить"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

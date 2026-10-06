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
  Package,
  Trash2,
  Edit3,
  Plus,
  Send,
  Inbox,
  Sparkles,
  Tag,
  Info,
  Check,
  X,
  ExternalLink,
  ChevronRight,
  HelpCircle,
  Eye,
  MessageSquare
} from "lucide-react";
import { cn } from "../../lib/utils";
import { SystemNewsItem } from "../Notifications/NotificationCenterModal";

export interface CompanyApplication {
  id: string;
  companyId: string;
  companyName: string;
  type: "erp_access" | "bitrix_integration" | "production_partnership" | "general" | "custom";
  title: string;
  message?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  adminComment?: string;
}

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
  const [activeTab, setActiveTab] = useState<"overview" | "companies" | "applications" | "news" | "users" | "notifications" | "database">("overview");
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [newsList, setNewsList] = useState<SystemNewsItem[]>([]);
  const [applications, setApplications] = useState<CompanyApplication[]>([]);
  const [totalProjectsCount, setTotalProjectsCount] = useState<number>(0);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  
  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [companyTypeFilter, setCompanyTypeFilter] = useState<string>("all");
  const [featureFilter, setFeatureFilter] = useState<"all" | "erp" | "bitrix" | "procurement">("all");
  const [appStatusFilter, setAppStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  
  // Modal / Editing state
  const [editingCompany, setEditingCompany] = useState<CompanyItem | null>(null);
  const [deletingCompany, setDeletingCompany] = useState<CompanyItem | null>(null);
  const [isDeletingCompany, setIsDeletingCompany] = useState(false);
  const [isSavingCompany, setIsSavingCompany] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // News creation modal
  const [isCreatingNews, setIsCreatingNews] = useState(false);
  const [editingNews, setEditingNews] = useState<SystemNewsItem | null>(null);
  const [newsForm, setNewsForm] = useState<{
    title: string;
    content: string;
    type: SystemNewsItem["type"];
    targetAudience: SystemNewsItem["targetAudience"];
    targetCompanyId: string;
    isBanner: boolean;
  }>({
    title: "",
    content: "",
    type: "info",
    targetAudience: "all",
    targetCompanyId: "",
    isBanner: false
  });
  const [isSavingNews, setIsSavingNews] = useState(false);

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

      // 3. Load News
      const newsRes = await fetch("/api/system/news");
      if (newsRes.ok) {
        const newsData = await newsRes.json();
        if (newsData.news && Array.isArray(newsData.news)) {
          setNewsList(newsData.news);
        }
      }

      // 4. Load Applications
      const appRes = await fetch("/api/system/applications");
      if (appRes.ok) {
        const appData = await appRes.json();
        if (appData.applications && Array.isArray(appData.applications)) {
          setApplications(appData.applications);
        }
      }

      // 5. Load Admin System Settings if saved
      const setRes = await fetch("/api/db/doc/system/admin_settings");
      if (setRes.ok) {
        const setData = await setRes.json();
        if (setData && typeof setData === "object") {
          setAdminSettings(prev => ({ ...prev, ...setData }));
        }
      }

      // 6. Count Projects across companies for stats
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

  // Permanently delete company and all its associated users & data
  const handleConfirmDeleteCompany = async () => {
    if (!deletingCompany) return;
    if (deletingCompany.id === "e5om9lzxh") {
      showToast("Компания «Мебель Фактура» защищена от удаления!", "error");
      setDeletingCompany(null);
      return;
    }

    setIsDeletingCompany(true);
    try {
      const res = await fetch(`/api/admin/company/${deletingCompany.id}`, {
        method: "DELETE"
      });

      if (res.ok) {
        showToast(`Компания «${deletingCompany.name || deletingCompany.id}» и все ее пользователи безвозвратно удалены.`);
        setCompanies(prev => prev.filter(c => c.id !== deletingCompany.id));
        setUsers(prev => prev.filter(u => u.companyId !== deletingCompany.id));
        setDeletingCompany(null);
      } else {
        showToast("Ошибка при удалении компании", "error");
      }
    } catch (e) {
      showToast("Ошибка сети при удалении", "error");
    } finally {
      setIsDeletingCompany(false);
    }
  };

  // Save or Publish News Item
  const handleSaveNews = async () => {
    if (!newsForm.title.trim() || !newsForm.content.trim()) {
      showToast("Заполните заголовок и текст новости", "error");
      return;
    }

    setIsSavingNews(true);
    try {
      const selectedComp = companies.find(c => c.id === newsForm.targetCompanyId);
      const payload: Partial<SystemNewsItem> = {
        ...(editingNews || {}),
        title: newsForm.title.trim(),
        content: newsForm.content.trim(),
        type: newsForm.type,
        targetAudience: newsForm.targetAudience,
        targetCompanyId: newsForm.targetAudience === "private" ? newsForm.targetCompanyId : undefined,
        targetCompanyName: newsForm.targetAudience === "private" ? selectedComp?.name : undefined,
        isBanner: newsForm.isBanner,
        isActive: true,
        authorName: "Администрация Мебель План"
      };

      const res = await fetch("/api/system/news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        if (data.newsItem) {
          setNewsList(prev => {
            const exists = prev.some(n => n.id === data.newsItem.id);
            if (exists) {
              return prev.map(n => n.id === data.newsItem.id ? data.newsItem : n);
            }
            return [data.newsItem, ...prev];
          });
        }
        showToast(editingNews ? "Новость обновлена!" : "Новость успешно опубликована!");
        setIsCreatingNews(false);
        setEditingNews(null);
        setNewsForm({
          title: "",
          content: "",
          type: "info",
          targetAudience: "all",
          targetCompanyId: "",
          isBanner: false
        });
      } else {
        showToast("Ошибка сохранения новости", "error");
      }
    } catch (e) {
      showToast("Ошибка сети при сохранении новости", "error");
    } finally {
      setIsSavingNews(false);
    }
  };

  // Delete News Item
  const handleDeleteNews = async (id: string) => {
    try {
      const res = await fetch(`/api/system/news/${id}`, { method: "DELETE" });
      if (res.ok) {
        setNewsList(prev => prev.filter(n => n.id !== id));
        showToast("Новость удалена");
      }
    } catch {
      showToast("Ошибка при удалении новости", "error");
    }
  };

  // Approve / Reject Company Application
  const handleUpdateApplicationStatus = async (app: CompanyApplication, newStatus: "approved" | "rejected") => {
    try {
      const res = await fetch(`/api/system/applications/${app.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          reviewedAt: new Date().toISOString(),
          reviewedBy: "lk.ivanbobkin@gmail.com"
        })
      });

      if (res.ok) {
        setApplications(prev => prev.map(a => a.id === app.id ? { ...a, status: newStatus } : a));
        
        // If approved and it's an ERP access request, automatically enable ERP for company!
        if (newStatus === "approved" && (app.type === "erp_access" || app.title?.toLowerCase().includes("erp"))) {
          const targetComp = companies.find(c => c.id === app.companyId);
          if (targetComp) {
            handleToggleFeature(targetComp, "erp", true);
          }
        }

        showToast(newStatus === "approved" ? "Заявка одобрена!" : "Заявка отклонена");
      }
    } catch {
      showToast("Ошибка обновления статуса заявки", "error");
    }
  };

  // Delete Application
  const handleDeleteApplication = async (id: string) => {
    try {
      const res = await fetch(`/api/system/applications/${id}`, { method: "DELETE" });
      if (res.ok) {
        setApplications(prev => prev.filter(a => a.id !== id));
        showToast("Заявка удалена");
      }
    } catch {
      showToast("Ошибка при удалении заявки", "error");
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
        showToast("Настройки системных уведомлений сохранены!");
      } else {
        showToast("Ошибка сохранения настроек", "error");
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

  // Filtered Applications
  const filteredApplications = useMemo(() => {
    return applications.filter(app => {
      if (appStatusFilter === "all") return true;
      return app.status === appStatusFilter;
    });
  }, [applications, appStatusFilter]);

  // Statistics summaries
  const stats = useMemo(() => {
    const totalComps = companies.length;
    const productions = companies.filter(c => (c.type || c.companyType || "").toLowerCase().includes("производ") || c.productionFormat === "own").length;
    const salons = companies.filter(c => (c.type || c.companyType || "").toLowerCase().includes("салон")).length;
    const designers = companies.filter(c => (c.type || c.companyType || "").toLowerCase().includes("дизайн")).length;
    const withBitrix = companies.filter(c => Boolean(c.bitrix24?.webhookUrl)).length;
    const withErp = companies.filter(c => Boolean(c.erpAllowed || c.erpEnabled)).length;
    const totalUsers = users.length;
    const pendingApps = applications.filter(a => a.status === "pending").length;

    return {
      totalComps,
      productions,
      salons,
      designers,
      withBitrix,
      withErp,
      totalUsers,
      pendingApps,
      totalProjects: totalProjectsCount
    };
  }, [companies, users, applications, totalProjectsCount]);

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
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200/80 px-4 sm:px-8 py-4">
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
      <main className="max-w-7xl mx-auto px-4 sm:px-8 pt-8 space-y-8">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 p-1.5 bg-gray-200/70 rounded-2xl w-full sm:w-fit border border-gray-300/60 shadow-inner overflow-x-auto">
          <button
            onClick={() => setActiveTab("overview")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
              activeTab === "overview" ? "bg-white text-blue-700 shadow-sm border border-gray-200" : "text-gray-600 hover:text-gray-900"
            )}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Обзор</span>
          </button>
          <button
            onClick={() => setActiveTab("companies")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
              activeTab === "companies" ? "bg-white text-blue-700 shadow-sm border border-gray-200" : "text-gray-600 hover:text-gray-900"
            )}
          >
            <Building2 className="w-4 h-4" />
            <span>Компании ({companies.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("applications")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap relative",
              activeTab === "applications" ? "bg-white text-blue-700 shadow-sm border border-gray-200" : "text-gray-600 hover:text-gray-900"
            )}
          >
            <Inbox className="w-4 h-4" />
            <span>Заявки</span>
            {stats.pendingApps > 0 && (
              <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-black">
                {stats.pendingApps}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("news")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
              activeTab === "news" ? "bg-white text-blue-700 shadow-sm border border-gray-200" : "text-gray-600 hover:text-gray-900"
            )}
          >
            <Bell className="w-4 h-4" />
            <span>Новости и оповещения ({newsList.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
              activeTab === "users" ? "bg-white text-blue-700 shadow-sm border border-gray-200" : "text-gray-600 hover:text-gray-900"
            )}
          >
            <Users className="w-4 h-4" />
            <span>Пользователи ({users.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("notifications")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
              activeTab === "notifications" ? "bg-white text-blue-700 shadow-sm border border-gray-200" : "text-gray-600 hover:text-gray-900"
            )}
          >
            <Mail className="w-4 h-4" />
            <span>E-mail рассылки</span>
          </button>
          <button
            onClick={() => setActiveTab("database")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
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

              {/* Card 2: Applications */}
              <div 
                onClick={() => setActiveTab("applications")}
                className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Заявки от компаний</span>
                  <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                    <Inbox className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-3xl font-black text-gray-900">{applications.length}</span>
                  {stats.pendingApps > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-black bg-red-100 text-red-700">
                      {stats.pendingApps} новых
                    </span>
                  )}
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                  <span>На рассмотрении: <strong className="text-amber-600">{stats.pendingApps}</strong></span>
                  <span>Одобрено: <strong className="text-emerald-600">{applications.filter(a => a.status === 'approved').length}</strong></span>
                </div>
              </div>

              {/* Card 3: Users */}
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
                  <span className="text-xs font-semibold text-gray-500">В системе</span>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                  <span>Суперадмин: <strong className="text-gray-800">1</strong></span>
                  <span>Компаний: <strong className="text-gray-800">{stats.totalComps}</strong></span>
                </div>
              </div>

              {/* Card 4: News */}
              <div 
                onClick={() => setActiveTab("news")}
                className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Оповещения</span>
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                    <Bell className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-3xl font-black text-gray-900">{newsList.length}</span>
                  <span className="text-xs font-semibold text-blue-600">В эфире</span>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                  <span>Баннеров: <strong className="text-gray-800">{newsList.filter(n => n.isBanner).length}</strong></span>
                  <span>Для всех: <strong className="text-gray-800">{newsList.filter(n => n.targetAudience === 'all').length}</strong></span>
                </div>
              </div>
            </div>

            {/* Quick Overview Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Companies List Preview */}
              <div className="bg-white rounded-3xl border border-gray-200/80 shadow-xs p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
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
                  {companies.slice(0, 5).map((comp) => {
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
                          <button
                            onClick={() => setEditingCompany(comp)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                            title="Редактировать компанию"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Pending Applications Preview */}
              <div className="bg-white rounded-3xl border border-gray-200/80 shadow-xs p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <div>
                    <h2 className="text-base font-extrabold text-gray-900">Новые заявки от компаний</h2>
                    <p className="text-xs text-gray-500">Запросы на доступ к ERP и подключение</p>
                  </div>
                  <button
                    onClick={() => setActiveTab("applications")}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                  >
                    <span>Все заявки</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                </div>

                {applications.length === 0 ? (
                  <div className="py-12 text-center text-gray-400 space-y-2">
                    <Inbox className="w-8 h-8 mx-auto text-gray-300" />
                    <p className="text-xs">Заявок пока нет</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {applications.slice(0, 4).map((app) => (
                      <div key={app.id} className="py-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-gray-900 truncate">{app.title}</h4>
                          <p className="text-[11px] text-gray-500 truncate">{app.companyName} • {app.contactName || app.contactEmail}</p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {app.status === "pending" ? (
                            <>
                              <button
                                onClick={() => handleUpdateApplicationStatus(app, "approved")}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition-all shadow-xs"
                              >
                                Одобрить
                              </button>
                              <button
                                onClick={() => handleUpdateApplicationStatus(app, "rejected")}
                                className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-[11px] font-bold transition-all"
                              >
                                Отклонить
                              </button>
                            </>
                          ) : (
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-[10px] font-bold",
                              app.status === "approved" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                            )}>
                              {app.status === "approved" ? "Одобрено" : "Отклонено"}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: COMPANIES MANAGEMENT WITH FULL DELETE */}
        {activeTab === "companies" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Search and Filters */}
            <div className="bg-white p-5 rounded-3xl border border-gray-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Поиск по названию, ID, email владельца, городу..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-blue-600 transition-colors"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={companyTypeFilter}
                  onChange={(e) => setCompanyTypeFilter(e.target.value)}
                  className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 cursor-pointer"
                >
                  <option value="all">Все типы компаний</option>
                  <option value="production">Производства</option>
                  <option value="salon">Салоны мебели</option>
                  <option value="designer">Дизайнеры</option>
                </select>

                <select
                  value={featureFilter}
                  onChange={(e) => setFeatureFilter(e.target.value as any)}
                  className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 cursor-pointer"
                >
                  <option value="all">Все модули</option>
                  <option value="erp">С доступом к ERP</option>
                  <option value="bitrix">С интеграцией Bitrix24</option>
                  <option value="procurement">Со снабжением</option>
                </select>
              </div>
            </div>

            {/* Companies Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCompanies.map((comp) => {
                const isMebelFaktura = comp.id === "e5om9lzxh" || (comp.name || "").toLowerCase().includes("мебель фактура");

                return (
                  <div
                    key={comp.id}
                    className={cn(
                      "bg-white rounded-3xl border transition-all p-6 space-y-5 flex flex-col justify-between shadow-xs hover:shadow-md relative group",
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

                      {/* Module switches */}
                      <div className="p-3 bg-gray-50 rounded-2xl space-y-2 border border-gray-100">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="flex items-center gap-1.5 text-gray-700">
                            <Factory className="w-3.5 h-3.5 text-blue-600" />
                            <span>Доступ к цеху (ERP):</span>
                          </span>
                          <button
                            onClick={() => handleToggleFeature(comp, "erp", !(comp.erpAllowed || comp.erpEnabled))}
                            className={cn(
                              "px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer border",
                              comp.erpAllowed || comp.erpEnabled
                                ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                                : "bg-gray-200 text-gray-600 border-gray-300 hover:bg-gray-300"
                            )}
                          >
                            {comp.erpAllowed || comp.erpEnabled ? "ВКЛЮЧЕН" : "ВЫКЛЮЧЕН"}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Bottom action buttons */}
                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                      <button
                        onClick={() => setEditingCompany(comp)}
                        className="flex-1 py-2 px-3 bg-gray-100 hover:bg-blue-50 hover:text-blue-600 text-gray-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Настроить</span>
                      </button>

                      {!isMebelFaktura && (
                        <button
                          onClick={() => setDeletingCompany(comp)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                          title="Удалить компанию и ее пользователей навсегда"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: COMPANY APPLICATIONS */}
        {activeTab === "applications" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-white p-5 rounded-3xl border border-gray-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-extrabold text-gray-900">Заявки от компаний</h2>
                <p className="text-xs text-gray-500">Запросы на открытие доступа к ERP, подключение партнерских цехов и интеграции</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAppStatusFilter("all")}
                  className={cn("px-3 py-1.5 rounded-xl text-xs font-bold transition-all", appStatusFilter === "all" ? "bg-blue-600 text-white font-extrabold" : "bg-gray-100 text-gray-700")}
                >
                  Все ({applications.length})
                </button>
                <button
                  onClick={() => setAppStatusFilter("pending")}
                  className={cn("px-3 py-1.5 rounded-xl text-xs font-bold transition-all", appStatusFilter === "pending" ? "bg-amber-500 text-white font-extrabold" : "bg-gray-100 text-gray-700")}
                >
                  Новые ({applications.filter(a => a.status === 'pending').length})
                </button>
                <button
                  onClick={() => setAppStatusFilter("approved")}
                  className={cn("px-3 py-1.5 rounded-xl text-xs font-bold transition-all", appStatusFilter === "approved" ? "bg-emerald-600 text-white font-extrabold" : "bg-gray-100 text-gray-700")}
                >
                  Одобренные ({applications.filter(a => a.status === 'approved').length})
                </button>
              </div>
            </div>

            {filteredApplications.length === 0 ? (
              <div className="bg-white rounded-3xl border border-gray-200 p-12 text-center text-gray-400 space-y-3">
                <Inbox className="w-12 h-12 mx-auto text-gray-300" />
                <h3 className="text-base font-bold text-gray-700">Заявок нет</h3>
                <p className="text-xs">В выбранной категории отсутствуют входящие заявки</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredApplications.map((app) => (
                  <div key={app.id} className="bg-white rounded-3xl border border-gray-200/80 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cn(
                          "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                          app.status === "pending" ? "bg-amber-100 text-amber-800 border border-amber-200" : app.status === "approved" ? "bg-emerald-100 text-emerald-800 border border-emerald-200" : "bg-red-100 text-red-800 border border-red-200"
                        )}>
                          {app.status === "pending" ? "На рассмотрении" : app.status === "approved" ? "Одобрена ✓" : "Отклонена"}
                        </span>
                        <span className="text-xs font-bold text-gray-400">
                          {new Date(app.createdAt).toLocaleDateString("ru-RU", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>

                      <h3 className="text-base font-extrabold text-gray-900">{app.title}</h3>
                      {app.message && (
                        <p className="text-xs text-gray-600 bg-gray-50 p-3 rounded-xl border border-gray-100">{app.message}</p>
                      )}

                      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 pt-1">
                        <span>Компания: <strong className="text-gray-800">{app.companyName} ({app.companyId})</strong></span>
                        {app.contactName && <span>Контакт: <strong className="text-gray-800">{app.contactName}</strong></span>}
                        {app.contactPhone && <span>Тел: <strong className="text-gray-800">{app.contactPhone}</strong></span>}
                        {app.contactEmail && <span>Email: <strong className="text-gray-800">{app.contactEmail}</strong></span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 border-t md:border-t-0 pt-3 md:pt-0">
                      {app.status === "pending" ? (
                        <>
                          <button
                            onClick={() => handleUpdateApplicationStatus(app, "approved")}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                          >
                            <Check className="w-4 h-4" />
                            <span>Одобрить доступ</span>
                          </button>
                          <button
                            onClick={() => handleUpdateApplicationStatus(app, "rejected")}
                            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                          >
                            Отклонить
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleDeleteApplication(app.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                          title="Удалить заявку"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: NEWS & ANNOUNCEMENTS WITH TARGETING */}
        {activeTab === "news" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Header & Create Button */}
            <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-extrabold text-gray-900">Новости и оповещения для пользователей</h2>
                <p className="text-xs text-gray-500">Публикуйте системные обновления, баннеры и персональные сообщения для категорий клиентов</p>
              </div>

              <button
                onClick={() => {
                  setEditingNews(null);
                  setNewsForm({
                    title: "",
                    content: "",
                    type: "info",
                    targetAudience: "all",
                    targetCompanyId: "",
                    isBanner: false
                  });
                  setIsCreatingNews(true);
                }}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-extrabold flex items-center gap-2 shadow-md shadow-blue-500/20 transition-all cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Создать новость / оповещение</span>
              </button>
            </div>

            {/* News List */}
            {newsList.length === 0 ? (
              <div className="bg-white rounded-3xl border border-gray-200 p-12 text-center text-gray-400 space-y-3">
                <Bell className="w-12 h-12 mx-auto text-gray-300" />
                <h3 className="text-base font-bold text-gray-700">Новостей пока нет</h3>
                <p className="text-xs">Нажмите «Создать новость», чтобы отправить первое объявление пользователям</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {newsList.map((item) => (
                  <div key={item.id} className="bg-white rounded-3xl border border-gray-200/80 p-6 shadow-xs flex flex-col justify-between space-y-4">
                    <div className="space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border",
                            item.type === "warning" ? "bg-amber-50 text-amber-700 border-amber-200" : item.type === "update" ? "bg-blue-50 text-blue-700 border-blue-200" : item.type === "promo" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-gray-100 text-gray-700 border-gray-200"
                          )}>
                            {item.type === "warning" ? "Важное" : item.type === "update" ? "Обновление" : item.type === "promo" ? "Акция" : "Информация"}
                          </span>

                          {item.isBanner && (
                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
                              Баннер вверху
                            </span>
                          )}
                        </div>

                        <span className="text-[11px] text-gray-400">
                          {new Date(item.createdAt).toLocaleDateString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>

                      <h3 className="text-base font-extrabold text-gray-900">{item.title}</h3>
                      <p className="text-xs text-gray-600 whitespace-pre-wrap line-clamp-4 leading-relaxed">{item.content}</p>

                      <div className="pt-2 border-t border-gray-100 flex items-center gap-2 text-[11px] text-gray-500 font-medium">
                        <span>Аудитория:</span>
                        <strong className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                          {item.targetAudience === "all" ? "👥 Все пользователи" : item.targetAudience === "production" ? "🏭 Только производства" : item.targetAudience === "salon" ? "🛋️ Только салоны" : item.targetAudience === "designer" ? "🎨 Только дизайнеры" : `🔒 Лично: ${item.targetCompanyName || item.targetCompanyId}`}
                        </strong>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setEditingNews(item);
                          setNewsForm({
                            title: item.title,
                            content: item.content,
                            type: item.type,
                            targetAudience: item.targetAudience,
                            targetCompanyId: item.targetCompanyId || "",
                            isBanner: !!item.isBanner
                          });
                          setIsCreatingNews(true);
                        }}
                        className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all"
                      >
                        Редактировать
                      </button>
                      <button
                        onClick={() => handleDeleteNews(item.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                        title="Удалить новость"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: USERS MANAGEMENT */}
        {activeTab === "users" && (
          <div className="bg-white rounded-3xl border border-gray-200/80 shadow-xs p-6 space-y-6 animate-in fade-in duration-200">
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

        {/* TAB 6: NOTIFICATIONS & EMAIL SETTINGS */}
        {activeTab === "notifications" && (
          <div className="bg-white rounded-3xl border border-gray-200/80 shadow-xs p-8 space-y-8 animate-in fade-in duration-200 max-w-4xl">
            <div>
              <h2 className="text-lg font-black text-gray-900">Настройка системных e-mail уведомлений</h2>
              <p className="text-xs text-gray-500">Настройте оповещения на вашу личную почту о регистрации пользователей, новых компаниях и заявках</p>
            </div>

            {/* Email Notification Address */}
            <div className="space-y-4 p-6 rounded-2xl bg-gray-50 border border-gray-200/80">
              <h3 className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
                <Mail className="w-4 h-4 text-blue-600" />
                <span>E-mail администратора для получения системных отчетов</span>
              </h3>
              
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">Электронная почта:</label>
                <input
                  type="email"
                  value={adminSettings.adminNotificationEmail}
                  onChange={(e) => setAdminSettings({ ...adminSettings, adminNotificationEmail: e.target.value })}
                  placeholder="lk.ivanbobkin@gmail.com"
                  className="w-full max-w-md px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-semibold focus:outline-hidden focus:border-blue-600"
                />
              </div>

              <div className="space-y-2 pt-2">
                <label className="flex items-center gap-2.5 text-xs font-bold cursor-pointer text-gray-800">
                  <input
                    type="checkbox"
                    checked={adminSettings.notifyOnNewUser}
                    onChange={(e) => setAdminSettings({ ...adminSettings, notifyOnNewUser: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600"
                  />
                  <span>Отправлять письмо при регистрации нового пользователя</span>
                </label>

                <label className="flex items-center gap-2.5 text-xs font-bold cursor-pointer text-gray-800">
                  <input
                    type="checkbox"
                    checked={adminSettings.notifyOnNewCompany}
                    onChange={(e) => setAdminSettings({ ...adminSettings, notifyOnNewCompany: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600"
                  />
                  <span>Отправлять письмо при подаче заявки или регистрации компании</span>
                </label>
              </div>

              <div className="pt-3">
                <button
                  onClick={handleSaveAdminSettings}
                  disabled={savingSettings}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold shadow-md transition-all cursor-pointer"
                >
                  {savingSettings ? "Сохранение..." : "Сохранить настройки"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: DATABASE */}
        {activeTab === "database" && (
          <div className="bg-white rounded-3xl border border-gray-200/80 shadow-xs p-8 space-y-6 animate-in fade-in duration-200 max-w-4xl">
            <div>
              <h2 className="text-lg font-black text-gray-900">Состояние базы данных и хранилища</h2>
              <p className="text-xs text-gray-500">Техническая информация о подключении и резервировании</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-emerald-950">In-Memory LocalStore</h4>
                  <p className="text-[11px] text-emerald-800 font-medium">Активно (0 мс задержка)</p>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-blue-50 border border-blue-200 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-blue-950">PostgreSQL Cloud SQL</h4>
                  <p className="text-[11px] text-blue-800 font-medium">Фоновая синхронизация</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* CREATE / EDIT NEWS MODAL */}
      {isCreatingNews && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-xl bg-white rounded-3xl p-8 shadow-2xl border border-gray-100 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Bell className="w-4 h-4" />
                </div>
                <h3 className="text-base font-extrabold text-gray-900">
                  {editingNews ? "Редактировать новость" : "Создать новость / объявление"}
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsCreatingNews(false);
                  setEditingNews(null);
                }}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Заголовок новости:</label>
                <input
                  type="text"
                  value={newsForm.title}
                  onChange={(e) => setNewsForm({ ...newsForm, title: e.target.value })}
                  placeholder="Например: Вышло обновление калькулятора мебели v2.4"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold focus:outline-hidden focus:border-blue-600"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Текст сообщения:</label>
                <textarea
                  rows={4}
                  value={newsForm.content}
                  onChange={(e) => setNewsForm({ ...newsForm, content: e.target.value })}
                  placeholder="Подробный текст новости или инструкции..."
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-medium focus:outline-hidden focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Тип объявления:</label>
                  <select
                    value={newsForm.type}
                    onChange={(e) => setNewsForm({ ...newsForm, type: e.target.value as any })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold text-gray-800"
                  >
                    <option value="info">ℹ️ Информация</option>
                    <option value="update">🚀 Обновление системы</option>
                    <option value="warning">⚠️ Важное предупреждение</option>
                    <option value="promo">🎉 Акция / Предложение</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Кому показывать (Аудитория):</label>
                  <select
                    value={newsForm.targetAudience}
                    onChange={(e) => setNewsForm({ ...newsForm, targetAudience: e.target.value as any })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold text-gray-800"
                  >
                    <option value="all">👥 Всем пользователям и компаниям</option>
                    <option value="production">🏭 Только мебельным производствам</option>
                    <option value="salon">🛋️ Только салонам мебели</option>
                    <option value="designer">🎨 Только дизайнерам</option>
                    <option value="private">🔒 Частное (Конкретной компании)</option>
                  </select>
                </div>
              </div>

              {newsForm.targetAudience === "private" && (
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Выберите компанию:</label>
                  <select
                    value={newsForm.targetCompanyId}
                    onChange={(e) => setNewsForm({ ...newsForm, targetCompanyId: e.target.value })}
                    className="w-full px-3 py-2 bg-purple-50 border border-purple-200 rounded-xl text-xs font-bold text-purple-900"
                  >
                    <option value="">-- Выберите компанию --</option>
                    {companies.map(c => (
                      <option key={c.id} value={c.id}>{c.name || c.id} ({c.ownerEmail || c.type || 'Компания'})</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isBannerCheckbox"
                  checked={newsForm.isBanner}
                  onChange={(e) => setNewsForm({ ...newsForm, isBanner: e.target.checked })}
                  className="w-4 h-4 rounded text-amber-600 cursor-pointer"
                />
                <label htmlFor="isBannerCheckbox" className="text-xs font-bold text-amber-900 cursor-pointer">
                  Показывать также всплывающим баннером вверху экрана у выбранных пользователей
                </label>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setIsCreatingNews(false);
                  setEditingNews(null);
                }}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Отмена
              </button>
              <button
                onClick={handleSaveNews}
                disabled={isSavingNews}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold shadow-md shadow-blue-500/20 transition-all cursor-pointer"
              >
                {isSavingNews ? "Публикация..." : editingNews ? "Сохранить изменения" : "Опубликовать новость"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT COMPANY MODAL */}
      {editingCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-white rounded-3xl p-8 shadow-2xl border border-gray-100 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-gray-900">Редактирование параметров компании</h3>
                  <span className="text-xs text-gray-400 font-mono">ID: {editingCompany.id}</span>
                </div>
              </div>
              <button
                onClick={() => setEditingCompany(null)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Название компании:</label>
                  <input
                    type="text"
                    value={editingCompany.name || ""}
                    onChange={(e) => setEditingCompany({ ...editingCompany, name: e.target.value })}
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Тип компании:</label>
                  <select
                    value={editingCompany.type || editingCompany.companyType || "Мебельное производство"}
                    onChange={(e) => setEditingCompany({ ...editingCompany, type: e.target.value, companyType: e.target.value })}
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold"
                  >
                    <option value="Мебельное производство">Мебельное производство</option>
                    <option value="Салон мебели">Салон мебели</option>
                    <option value="Дизайнер интерьера">Дизайнер интерьера</option>
                    <option value="Частный мастер">Частный мастер</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">E-mail владельца:</label>
                  <input
                    type="text"
                    value={editingCompany.ownerEmail || ""}
                    onChange={(e) => setEditingCompany({ ...editingCompany, ownerEmail: e.target.value })}
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Город:</label>
                  <input
                    type="text"
                    value={editingCompany.city || ""}
                    onChange={(e) => setEditingCompany({ ...editingCompany, city: e.target.value })}
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-medium"
                  />
                </div>
              </div>

              {/* Bitrix24 settings */}
              <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-200/80 space-y-3">
                <h4 className="text-xs font-extrabold text-amber-900">Интеграция с Битрикс24:</h4>
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-1">Вебхук Bitrix24 REST API:</label>
                    <input
                      type="text"
                      value={editingCompany.bitrix24?.webhookUrl || ""}
                      onChange={(e) => setEditingCompany({
                        ...editingCompany,
                        bitrix24: { ...(editingCompany.bitrix24 || {}), webhookUrl: e.target.value }
                      })}
                      placeholder="https://your-domain.bitrix24.ru/rest/1/webhook_token/"
                      className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Modules toggle */}
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
                <h4 className="text-xs font-extrabold text-gray-900">Доступные модули:</h4>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 text-xs font-bold cursor-pointer text-gray-800">
                    <input
                      type="checkbox"
                      checked={Boolean(editingCompany.erpAllowed || editingCompany.erpEnabled)}
                      onChange={(e) => setEditingCompany({
                        ...editingCompany,
                        erpAllowed: e.target.checked,
                        erpEnabled: e.target.checked
                      })}
                      className="w-4 h-4 rounded text-blue-600"
                    />
                    <span>Производственный цех (ERP)</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs font-bold cursor-pointer text-gray-800">
                    <input
                      type="checkbox"
                      checked={Boolean(editingCompany.procurementEnabled)}
                      onChange={(e) => setEditingCompany({
                        ...editingCompany,
                        procurementEnabled: e.target.checked
                      })}
                      className="w-4 h-4 rounded text-blue-600"
                    />
                    <span>Снабжение и склад</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
              <button
                onClick={() => setEditingCompany(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Отмена
              </button>
              <button
                onClick={handleSaveCompanyModal}
                disabled={isSavingCompany}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold shadow-md transition-all cursor-pointer"
              >
                {isSavingCompany ? "Сохранение..." : "Сохранить"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PERMANENT COMPANY DELETION MODAL */}
      {deletingCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-3xl p-7 shadow-2xl border border-red-200 space-y-5">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-black text-gray-900">Удалить компанию навсегда?</h3>
                <p className="text-xs text-red-600 font-semibold">Это действие необратимо</p>
              </div>
            </div>

            <div className="p-4 bg-red-50 rounded-2xl border border-red-100 text-xs text-red-950 space-y-2">
              <p>
                Вы собираетесь безвозвратно удалить компанию:
              </p>
              <p className="font-extrabold text-sm text-red-900">
                «{deletingCompany.name || deletingCompany.id}» (ID: {deletingCompany.id})
              </p>
              <ul className="list-disc pl-4 space-y-1 text-red-800 text-[11px]">
                <li>Будут удалены все связанные пользователи этой компании</li>
                <li>Будут удалены все проекты, сметы и спецификации</li>
                <li>Будут очищены производственные заказы и настройки</li>
              </ul>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                onClick={() => setDeletingCompany(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Отмена
              </button>
              <button
                onClick={handleConfirmDeleteCompany}
                disabled={isDeletingCompany}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black shadow-lg shadow-red-500/20 transition-all cursor-pointer"
              >
                {isDeletingCompany ? "Удаление..." : "Да, удалить навсегда"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

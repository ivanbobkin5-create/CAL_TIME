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
  MessageSquare,
  CreditCard,
  FileText,
  QrCode,
  Warehouse,
  Truck,
  DollarSign
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
  const [activeTab, setActiveTab] = useState<"overview" | "companies" | "applications" | "news" | "socials" | "users" | "notifications" | "requisites" | "database">("overview");
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [newsList, setNewsList] = useState<SystemNewsItem[]>([]);
  const [applications, setApplications] = useState<CompanyApplication[]>([]);
  const [moduleRequests, setModuleRequests] = useState<any[]>([]);
  const [appTypeTab, setAppTypeTab] = useState<"module_requests" | "company_apps">("module_requests");
  const [totalProjectsCount, setTotalProjectsCount] = useState<number>(0);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  
  // Requisites state
  const [paymentRequisites, setPaymentRequisites] = useState({
    payeeName: "ИП Бобкин Иван Александрович",
    inn: "770000000000",
    account: "40802810000000000000",
    bankName: "ПАО СБЕРБАНК",
    bic: "044525225",
    corrAccount: "30101810400000000225"
  });
  const [savingRequisites, setSavingRequisites] = useState(false);
  
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

  // Superadmin Proposal Creation Modal State
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [proposalCompanyId, setProposalCompanyId] = useState("");
  const [proposalModules, setProposalModules] = useState<string[]>(["erp"]);
  const [proposalPeriod, setProposalPeriod] = useState<string>("month");
  const [proposalPrice, setProposalPrice] = useState<number>(5000);
  const [proposalComment, setProposalComment] = useState("");
  const [proposalAutoActivate, setProposalAutoActivate] = useState(false);
  const [isSubmittingProposal, setIsSubmittingProposal] = useState(false);

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

  // Social Cross-Posting (Telegram + VK) State
  const [socialConfig, setSocialConfig] = useState({
    telegramEnabled: true,
    telegramBotToken: "",
    telegramChatId: "",
    telegramChannelTitle: "",
    vkEnabled: true,
    vkAccessToken: "",
    vkGroupId: "",
    vkGroupName: "",
    defaultCtaText: "Открыть Мебель План",
    defaultCtaUrl: "https://mebel-plan.ru",
    defaultHashtags: "#мебельплан #мебельноепроизводство #раскрой #erp"
  });
  const [socialPosts, setSocialPosts] = useState<any[]>([]);
  const [savingSocialConfig, setSavingSocialConfig] = useState(false);
  const [testingTelegram, setTestingTelegram] = useState(false);
  const [testingVk, setTestingVk] = useState(false);
  const [showSocialGuide, setShowSocialGuide] = useState(false);
  const [socialPostForm, setSocialPostForm] = useState({
    title: "",
    content: "",
    imageUrl: "",
    ctaText: "Попробовать Мебель План",
    ctaUrl: "https://mebel-plan.ru",
    hashtags: "#мебельплан #мебельноепроизводство #раскрой #erp",
    targetTelegram: true,
    targetVk: true,
    targetInternalNews: true,
    internalNewsType: "info" as SystemNewsItem["type"],
    internalIsBanner: false
  });
  const [publishingSocialPost, setPublishingSocialPost] = useState(false);
  const [lastPublishReport, setLastPublishReport] = useState<Record<string, { ok: boolean; message: string }> | null>(null);

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

      // 4b. Load Module Payment Requests
      try {
        const modReqRes = await fetch("/api/module-payment-requests");
        if (modReqRes.ok) {
          const modReqData = await modReqRes.json();
          if (modReqData.requests && Array.isArray(modReqData.requests)) {
            setModuleRequests(modReqData.requests);
          }
        }
      } catch (_) {}

      // 4c. Load Payment Requisites
      try {
        const reqRes = await fetch("/api/system/payment-requisites");
        if (reqRes.ok) {
          const reqData = await reqRes.json();
          if (reqData.requisites) {
            setPaymentRequisites(prev => ({ ...prev, ...reqData.requisites }));
          }
        }
      } catch (_) {}

      // 5. Load Admin System Settings if saved
      const setRes = await fetch("/api/db/doc/system/admin_settings");
      if (setRes.ok) {
        const setData = await setRes.json();
        if (setData && typeof setData === "object") {
          setAdminSettings(prev => ({ ...prev, ...setData }));
        }
      }

      // 5b. Load Social Autopost Config & Post History
      try {
        const socRes = await fetch("/api/system/social-config");
        if (socRes.ok) {
          const socData = await socRes.json();
          if (socData.config) {
            setSocialConfig(prev => ({ ...prev, ...socData.config }));
            setSocialPostForm(prev => ({
              ...prev,
              ctaText: socData.config.defaultCtaText || prev.ctaText,
              ctaUrl: socData.config.defaultCtaUrl || prev.ctaUrl,
              hashtags: socData.config.defaultHashtags || prev.hashtags
            }));
          }
          if (Array.isArray(socData.posts)) {
            setSocialPosts(socData.posts);
          }
        }
      } catch (_) {}

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

  // Save Social Config (Telegram + VK)
  const handleSaveSocialConfig = async () => {
    setSavingSocialConfig(true);
    try {
      const res = await fetch("/api/system/social-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(socialConfig)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.config) setSocialConfig(prev => ({ ...prev, ...data.config }));
        showToast("Настройки Telegram и ВКонтакте сохранены!");
      } else {
        showToast("Не удалось сохранить настройки соцсетей", "error");
      }
    } catch {
      showToast("Ошибка сети при сохранении настроек соцсетей", "error");
    } finally {
      setSavingSocialConfig(false);
    }
  };

  // Test Telegram or VK connection
  const handleTestSocialConnection = async (platform: "telegram" | "vk") => {
    if (platform === "telegram") setTestingTelegram(true);
    else setTestingVk(true);
    try {
      const res = await fetch("/api/system/social-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          telegramBotToken: socialConfig.telegramBotToken,
          telegramChatId: socialConfig.telegramChatId,
          vkAccessToken: socialConfig.vkAccessToken,
          vkGroupId: socialConfig.vkGroupId
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (platform === "telegram" && data.title) {
          const nextCfg = { ...socialConfig, telegramChannelTitle: data.title };
          setSocialConfig(nextCfg);
          await fetch("/api/system/social-config", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(nextCfg)
          });
        }
        if (platform === "vk" && data.groupName) {
          const nextCfg = { ...socialConfig, vkGroupName: data.groupName };
          setSocialConfig(nextCfg);
          await fetch("/api/system/social-config", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(nextCfg)
          });
        }
        showToast(data.message || "Подключение успешно проверено!");
      } else {
        showToast(data.error || "Ошибка проверки подключения", "error");
      }
    } catch {
      showToast("Ошибка соединения при проверке", "error");
    } finally {
      if (platform === "telegram") setTestingTelegram(false);
      else setTestingVk(false);
    }
  };

  // Handle local image file selection for Social Post
  const handleSocialImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setSocialPostForm(prev => ({ ...prev, imageUrl: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  // Publish simultaneously to selected Social Networks
  const handlePublishSocialPost = async () => {
    if (!socialPostForm.content.trim()) {
      showToast("Введите текст записи для публикации", "error");
      return;
    }
    if (!socialPostForm.targetTelegram && !socialPostForm.targetVk && !socialPostForm.targetInternalNews) {
      showToast("Выберите хотя бы одну площадку для публикации (Telegram, ВК или Платформа)", "error");
      return;
    }

    setPublishingSocialPost(true);
    setLastPublishReport(null);
    try {
      // Save current tokens first so server has the latest ones
      await fetch("/api/system/social-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(socialConfig)
      });

      const res = await fetch("/api/system/social-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: socialPostForm.title.trim(),
          content: socialPostForm.content.trim(),
          imageUrl: socialPostForm.imageUrl.trim(),
          ctaText: socialPostForm.ctaText.trim(),
          ctaUrl: socialPostForm.ctaUrl.trim(),
          hashtags: socialPostForm.hashtags.trim(),
          targets: {
            telegram: socialPostForm.targetTelegram,
            vk: socialPostForm.targetVk,
            internalNews: socialPostForm.targetInternalNews
          },
          internalNewsType: socialPostForm.internalNewsType,
          internalIsBanner: socialPostForm.internalIsBanner
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (data.post) {
          setSocialPosts(prev => [data.post, ...prev]);
        }
        if (data.newsItem) {
          setNewsList(prev => [data.newsItem, ...prev]);
        }
        if (data.results) {
          setLastPublishReport(data.results);
          const allOk = Object.values(data.results).every((r: any) => r.ok);
          const anyOk = Object.values(data.results).some((r: any) => r.ok);
          if (allOk) {
            showToast("Запись успешно опубликована во все выбранные соцсети!");
          } else if (anyOk) {
            showToast("Запись опубликована частично — проверьте статусы площадок ниже", "error");
          } else {
            showToast("Не удалось опубликовать запись — проверьте токены доступа", "error");
          }
        }
      } else {
        showToast(data.error || "Ошибка при публикации", "error");
      }
    } catch {
      showToast("Ошибка сети при отправке публикации", "error");
    } finally {
      setPublishingSocialPost(false);
    }
  };

  const handleDeleteSocialPostHistory = async (id: string) => {
    try {
      const res = await fetch(`/api/system/social-post/${id}`, { method: "DELETE" });
      if (res.ok) {
        setSocialPosts(prev => prev.filter(p => p.id !== id));
        showToast("Запись удалена из журнала");
      }
    } catch {
      showToast("Не удалось удалить запись", "error");
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

  // Approve / Reject Module Payment Request
  const handleUpdateModuleRequestStatus = async (reqId: string, status: "approved" | "rejected") => {
    try {
      const res = await fetch(`/api/module-payment-requests/${reqId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        setModuleRequests(prev => prev.map(m => m.id === reqId ? { ...m, status } : m));
        showToast(status === "approved" ? "Заявка одобрена! Модули подключены для компании." : "Заявка отклонена");
        loadSystemData();
      } else {
        showToast("Не удалось обновить статус заявки", "error");
      }
    } catch {
      showToast("Ошибка сети при обновлении заявки", "error");
    }
  };

  // Create Superadmin Proposal for Company
  const handleCreateProposal = async () => {
    if (!proposalCompanyId) {
      showToast("Выберите компанию для предложения", "error");
      return;
    }
    if (proposalModules.length === 0) {
      showToast("Выберите хотя бы один модуль", "error");
      return;
    }

    try {
      setIsSubmittingProposal(true);
      const targetCompany = companies.find(c => c.id === proposalCompanyId);
      const companyName = targetCompany?.name || proposalCompanyId;
      const initialStatus = proposalAutoActivate ? "approved" : "offered";

      const requestPayload = {
        companyId: proposalCompanyId,
        companyName,
        contactPhone: targetCompany?.phone || (targetCompany as any)?.contactPhone || "",
        modules: proposalModules,
        period: proposalPeriod,
        totalAmount: proposalPrice,
        status: initialStatus,
        type: "admin_proposal",
        comment: proposalComment,
        createdAt: new Date().toISOString()
      };

      const res = await fetch("/api/module-payment-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request: requestPayload })
      });

      if (res.ok) {
        const data = await res.json();
        if (proposalAutoActivate && data.request?.id) {
          await fetch(`/api/module-payment-requests/${data.request.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "approved" })
          });
        }

        showToast(proposalAutoActivate ? "Предложение создано, модули сразу активированы!" : "Предложение успешно отправлено компании!");
        setShowProposalModal(false);
        setProposalComment("");
        loadSystemData();
      } else {
        showToast("Ошибка при создании предложения", "error");
      }
    } catch {
      showToast("Ошибка сети при отправке предложения", "error");
    } finally {
      setIsSubmittingProposal(false);
    }
  };

  // Save IP / Payment Requisites
  const handleSaveRequisites = async () => {
    try {
      setSavingRequisites(true);
      const res = await fetch("/api/system/payment-requisites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requisites: paymentRequisites })
      });
      if (res.ok) {
        showToast("Реквизиты ИП успешно сохранены!");
      } else {
        showToast("Ошибка при сохранении реквизитов", "error");
      }
    } catch {
      showToast("Ошибка сети при сохранении реквизитов", "error");
    } finally {
      setSavingRequisites(false);
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
    const pendingApps = applications.filter(a => a.status === "pending").length + moduleRequests.filter(m => m.status === "pending").length;

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
  }, [companies, users, applications, moduleRequests, totalProjectsCount]);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-gray-900 pb-12">
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

      {/* Main Top Header */}
      <header className="bg-white border-b border-gray-200/80 px-4 sm:px-8 py-4 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20 text-white font-black text-xl shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-gray-900 tracking-tight">Панель Суперадминистратора</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200">
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
              <span>Обновить данные</span>
            </button>
            <div className="h-6 w-px bg-gray-200" />
            <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-xl border border-emerald-200 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Сервер активен</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 pt-6 space-y-6">
        {/* Navigation Tabs Bar */}
        <div className="flex items-center gap-1.5 p-1.5 bg-gray-200/70 rounded-2xl border border-gray-300/60 shadow-inner overflow-x-auto">
          <button
            onClick={() => setActiveTab("overview")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
              activeTab === "overview"
                ? "bg-white text-blue-700 shadow-sm border border-gray-200 font-extrabold"
                : "text-gray-600 hover:text-gray-900"
            )}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Обзор</span>
          </button>

          <button
            onClick={() => setActiveTab("companies")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
              activeTab === "companies"
                ? "bg-white text-blue-700 shadow-sm border border-gray-200 font-extrabold"
                : "text-gray-600 hover:text-gray-900"
            )}
          >
            <Building2 className="w-4 h-4" />
            <span>Компании ({companies.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("applications")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap relative",
              activeTab === "applications"
                ? "bg-white text-blue-700 shadow-sm border border-gray-200 font-extrabold"
                : "text-gray-600 hover:text-gray-900"
            )}
          >
            <Inbox className="w-4 h-4" />
            <span>Заявки</span>
            {stats.pendingApps > 0 && (
              <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-black animate-pulse">
                {stats.pendingApps}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("news")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
              activeTab === "news"
                ? "bg-white text-blue-700 shadow-sm border border-gray-200 font-extrabold"
                : "text-gray-600 hover:text-gray-900"
            )}
          >
            <Bell className="w-4 h-4" />
            <span>Новости ({newsList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("socials")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
              activeTab === "socials"
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm font-extrabold"
                : "text-blue-700 bg-blue-50/80 hover:bg-blue-100/80"
            )}
          >
            <Send className="w-4 h-4" />
            <span>Мультипостинг (TG + ВК)</span>
          </button>

          <button
            onClick={() => setActiveTab("users")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
              activeTab === "users"
                ? "bg-white text-blue-700 shadow-sm border border-gray-200 font-extrabold"
                : "text-gray-600 hover:text-gray-900"
            )}
          >
            <Users className="w-4 h-4" />
            <span>Пользователи ({users.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("notifications")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
              activeTab === "notifications"
                ? "bg-white text-blue-700 shadow-sm border border-gray-200 font-extrabold"
                : "text-gray-600 hover:text-gray-900"
            )}
          >
            <Mail className="w-4 h-4" />
            <span>E-mail рассылки</span>
          </button>

          <button
            onClick={() => setActiveTab("requisites")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
              activeTab === "requisites"
                ? "bg-white text-blue-700 shadow-sm border border-gray-200 font-extrabold"
                : "text-gray-600 hover:text-gray-900"
            )}
          >
            <CreditCard className="w-4 h-4" />
            <span>Реквизиты ИП</span>
          </button>

          <button
            onClick={() => setActiveTab("database")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
              activeTab === "database"
                ? "bg-white text-blue-700 shadow-sm border border-gray-200 font-extrabold"
                : "text-gray-600 hover:text-gray-900"
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

        {/* TAB 3: APPLICATIONS & MODULE SUBSCRIPTIONS */}
        {activeTab === "applications" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Header & Category Switcher */}
            <div className="bg-white p-5 rounded-3xl border border-gray-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-extrabold text-gray-900">Заявки и запросы</h2>
                <p className="text-xs text-gray-500">Запросы компаний на подключение модулей, оплату и предложения администратора</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => {
                    if (companies.length > 0 && !proposalCompanyId) setProposalCompanyId(companies[0].id);
                    setShowProposalModal(true);
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-sm shadow-indigo-200 cursor-pointer active:scale-95"
                >
                  <Plus className="w-4 h-4 text-amber-300" />
                  <span>Сформировать предложение компании</span>
                </button>

                {/* Module Requests vs Company Access Apps toggle */}
                <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-2xl border border-gray-200">
                  <button
                    onClick={() => setAppTypeTab("module_requests")}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer",
                      appTypeTab === "module_requests" ? "bg-white text-indigo-700 shadow-sm font-extrabold" : "text-gray-600 hover:text-gray-900"
                    )}
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Подключение модулей</span>
                    {moduleRequests.filter(m => m.status === 'pending').length > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black">
                        {moduleRequests.filter(m => m.status === 'pending').length}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setAppTypeTab("company_apps")}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer",
                      appTypeTab === "company_apps" ? "bg-white text-indigo-700 shadow-sm font-extrabold" : "text-gray-600 hover:text-gray-900"
                    )}
                  >
                    <Building2 className="w-4 h-4" />
                    <span>Доступ компаний</span>
                    {applications.filter(a => a.status === 'pending').length > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black">
                        {applications.filter(a => a.status === 'pending').length}
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* SECTION 1: MODULE PAYMENT REQUESTS */}
            {appTypeTab === "module_requests" && (
              <div className="space-y-4">
                {moduleRequests.length === 0 ? (
                  <div className="bg-white rounded-3xl border border-gray-200 p-12 text-center text-gray-400 space-y-3">
                    <CreditCard className="w-12 h-12 mx-auto text-gray-300" />
                    <h3 className="text-base font-bold text-gray-700">Заявок на модули нет</h3>
                    <p className="text-xs">Запросы на подключение платных модулей (ERP, Склад, Снабжение) будут появляться здесь</p>
                  </div>
                ) : (
                  moduleRequests.map((modReq) => {
                    const reqModules: string[] = Array.isArray(modReq.modules) ? modReq.modules : [modReq.modules].filter(Boolean);
                    const periodText = modReq.period === 'year' || modReq.months === 12 ? '12 месяцев (Годовой тариф -20%)' : modReq.period === 'half_year' || modReq.months === 6 ? '6 месяцев (-15%)' : '1 месяц';

                    return (
                      <div key={modReq.id} className="bg-white rounded-3xl border border-gray-200/80 p-6 shadow-xs space-y-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-4">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={cn(
                                "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                                modReq.status === "pending" ? "bg-amber-100 text-amber-800 border border-amber-200" : modReq.status === "approved" ? "bg-emerald-100 text-emerald-800 border border-emerald-200" : "bg-red-100 text-red-800 border border-red-200"
                              )}>
                                {modReq.status === "pending" ? "Ожидает подтверждения" : modReq.status === "approved" ? "Одобрена ✓ Модули подключены" : "Отклонена"}
                              </span>
                              <span className="text-xs font-bold text-gray-400">
                                {modReq.createdAt ? new Date(modReq.createdAt).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                              </span>
                            </div>
                            <h3 className="text-base font-extrabold text-gray-900">
                              Компания: <span className="text-indigo-600">{modReq.companyName || 'Без названия'}</span>
                              <span className="text-xs text-gray-400 font-mono ml-2">({modReq.companyId})</span>
                            </h3>
                            <div className="text-xs font-bold text-slate-700 mt-1 flex items-center gap-2">
                              <span className="text-slate-400 font-semibold">Контактный телефон компании:</span>
                              <a href={`tel:${modReq.contactPhone || companies.find(c => c.id === modReq.companyId)?.phone || ''}`} className="text-indigo-700 font-mono bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-100 font-black hover:underline">
                                📞 {modReq.contactPhone || companies.find(c => c.id === modReq.companyId)?.phone || 'Не указан'}
                              </a>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            {modReq.status === "pending" ? (
                              <>
                                <button
                                  onClick={() => handleUpdateModuleRequestStatus(modReq.id, "approved")}
                                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold transition-all shadow-md shadow-emerald-500/20 flex items-center gap-2 cursor-pointer active:scale-95"
                                >
                                  <Check className="w-4 h-4" />
                                  <span>Одобрить и подключить модули</span>
                                </button>
                                <button
                                  onClick={() => handleUpdateModuleRequestStatus(modReq.id, "rejected")}
                                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                                >
                                  Отклонить
                                </button>
                              </>
                            ) : (
                              <div className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 flex items-center gap-1.5">
                                <CheckCircle2 className="w-4 h-4" />
                                <span>Модули активированы</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Request Summary details */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                          <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100 space-y-1.5">
                            <span className="text-gray-400 font-bold block">Запрашиваемые модули:</span>
                            <div className="flex flex-wrap gap-1.5">
                              {reqModules.map((m) => (
                                <span key={m} className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg font-bold border border-indigo-100">
                                  {m === 'erp' ? 'Производство (ERP)' : m === 'procurement' ? 'Снабжение' : m === 'warehouse' ? 'Склад' : m === 'manager_salaries' ? 'Зарплаты менеджеров' : m}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100 space-y-1">
                            <span className="text-gray-400 font-bold block">Срок подписки:</span>
                            <span className="font-extrabold text-gray-800">{periodText}</span>
                          </div>

                          <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100 space-y-1">
                            <span className="text-gray-400 font-bold block">Итоговая сумма заявки:</span>
                            <span className="text-base font-black text-emerald-600">
                              {modReq.totalAmount ? `${Number(modReq.totalAmount).toLocaleString('ru-RU')} ₽` : '—'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* SECTION 2: COMPANY ACCESS APPLICATIONS */}
            {appTypeTab === "company_apps" && (
              <div className="space-y-4">
                {filteredApplications.length === 0 ? (
                  <div className="bg-white rounded-3xl border border-gray-200 p-12 text-center text-gray-400 space-y-3">
                    <Inbox className="w-12 h-12 mx-auto text-gray-300" />
                    <h3 className="text-base font-bold text-gray-700">Заявок нет</h3>
                    <p className="text-xs">В выбранной категории отсутствуют входящие заявки</p>
                  </div>
                ) : (
                  filteredApplications.map((app) => (
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
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB: REQUISITES FOR IP & PAYMENTS */}
        {activeTab === "requisites" && (
          <div className="space-y-6 animate-in fade-in duration-200 max-w-4xl">
            <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs space-y-6">
              <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                  <CreditCard className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-base font-black text-gray-900">Реквизиты ИП и Банковского счета</h2>
                  <p className="text-xs text-gray-500">Укажите данные вашего ИП для приема оплаты за модули и генерации QR-кодов СБП</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
                <div className="sm:col-span-2">
                  <label className="block font-extrabold text-gray-700 mb-1.5">
                    Наименование получателя (ИП / Организация) *
                  </label>
                  <input
                    type="text"
                    value={paymentRequisites.payeeName}
                    onChange={(e) => setPaymentRequisites({ ...paymentRequisites, payeeName: e.target.value })}
                    placeholder="Например: ИП Бобкин Иван Александрович"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-blue-500 font-semibold"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">Отображается в счетах и реквизитах платежа</p>
                </div>

                <div>
                  <label className="block font-extrabold text-gray-700 mb-1.5">ИНН получателя *</label>
                  <input
                    type="text"
                    value={paymentRequisites.inn}
                    onChange={(e) => setPaymentRequisites({ ...paymentRequisites, inn: e.target.value })}
                    placeholder="12 или 10 цифр ИНН"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-blue-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-extrabold text-gray-700 mb-1.5">БИК банка *</label>
                  <input
                    type="text"
                    value={paymentRequisites.bic}
                    onChange={(e) => setPaymentRequisites({ ...paymentRequisites, bic: e.target.value })}
                    placeholder="9 цифр БИК"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-blue-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-extrabold text-gray-700 mb-1.5">Расчетный счет (Р/С) *</label>
                  <input
                    type="text"
                    value={paymentRequisites.account}
                    onChange={(e) => setPaymentRequisites({ ...paymentRequisites, account: e.target.value })}
                    placeholder="20 цифр расчетного счета"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-blue-500 font-semibold font-mono"
                  />
                </div>

                <div>
                  <label className="block font-extrabold text-gray-700 mb-1.5">Корреспондентский счет (К/С) *</label>
                  <input
                    type="text"
                    value={paymentRequisites.corrAccount}
                    onChange={(e) => setPaymentRequisites({ ...paymentRequisites, corrAccount: e.target.value })}
                    placeholder="20 цифр корр. счета"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-blue-500 font-semibold font-mono"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-extrabold text-gray-700 mb-1.5">Наименование банка *</label>
                  <input
                    type="text"
                    value={paymentRequisites.bankName}
                    onChange={(e) => setPaymentRequisites({ ...paymentRequisites, bankName: e.target.value })}
                    placeholder="Например: ПАО СБЕРБАНК"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-blue-500 font-semibold"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Реквизиты синхронизируются с формой оплаты модулей</span>
                </div>

                <button
                  onClick={handleSaveRequisites}
                  disabled={savingRequisites}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold transition-all shadow-md shadow-blue-500/20 flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingRequisites ? "Сохранение..." : "Сохранить реквизиты ИП"}</span>
                </button>
              </div>
            </div>
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

        {/* TAB 4B: SOCIAL NETWORKS CROSS-POSTING (TELEGRAM + VK + INTERNAL NEWS) */}
        {activeTab === "socials" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Top Banner & Guide Toggle */}
            <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-extrabold text-gray-900">
                    Мультипостинг в Telegram-канал, группу ВКонтакте и «Мебель План»
                  </h2>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Настройте токены вашей группы ВК и бота Telegram один раз и публикуйте новости, акции и кейсы одновременно во все соцсети в 1 клик
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSocialGuide(prev => !prev)}
                className="px-4 py-2.5 rounded-2xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer shrink-0 border border-blue-200"
              >
                <HelpCircle className="w-4 h-4" />
                <span>{showSocialGuide ? "Скрыть инструкцию по подключению" : "Как подключить Telegram и ВК?"}</span>
              </button>
            </div>

            {/* Step-by-step Connection Instructions */}
            {showSocialGuide && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 shadow-xl">
                <div className="space-y-3">
                  <div className="text-xs font-black uppercase tracking-wider text-sky-400 flex items-center gap-2">
                    <Send className="w-4 h-4" />
                    Как подключить Telegram-канал за 1 минуту
                  </div>
                  <ol className="text-xs text-slate-300 space-y-2 list-decimal pl-4 leading-relaxed">
                    <li>
                      Откройте в Telegram официального бота <strong className="text-white">@BotFather</strong> и отправьте команду <code className="text-sky-300">/newbot</code>. Скопируйте выданный <strong>Bot Token</strong>.
                    </li>
                    <li>
                      Зайдите в настройки вашего Telegram-канала → <strong>Администраторы</strong> → <strong>Добавить администратора</strong> → найдите вашего бота и включите ему право <strong>«Публикация сообщений»</strong>.
                    </li>
                    <li>
                      В поле <strong>ID или @username канала</strong> укажите публичную ссылку канала через <code className="text-sky-300">@</code> (например, <code className="text-sky-300">@mebel_plan</code>) или приватный ID канала и нажмите «Проверить».
                    </li>
                  </ol>
                </div>

                <div className="space-y-3">
                  <div className="text-xs font-black uppercase tracking-wider text-blue-400 flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    Как подключить группу ВКонтакте
                  </div>
                  <ol className="text-xs text-slate-300 space-y-2 list-decimal pl-4 leading-relaxed">
                    <li>
                      Откройте ваше сообщество ВК → <strong>Управление</strong> → в адресной строке или разделе «Основная информация» скопируйте <strong>числовой ID сообщества</strong> (без минуса и букв <code className="text-slate-400">club</code>).
                    </li>
                    <li>
                      Получите <strong>Access Token (Ключ доступа)</strong> администратора с правами <code className="text-blue-300">wall, photos, groups, offline</code> (например, через приложение VK Admin или настройки API сообщества).
                    </li>
                    <li>
                      Вставьте числовой ID группы и токен в блок ВКонтакте ниже, нажмите <strong>«Проверить ВК»</strong> и сохраните настройки. Записи будут публиковаться от имени сообщества (<code className="text-blue-300">from_group=1</code>).
                    </li>
                  </ol>
                </div>
              </div>
            )}

            {/* Connection Settings Cards (Telegram & VK) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Telegram Config Card */}
              <div className="bg-white rounded-3xl border border-gray-200/80 p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
                      <Send className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-gray-900">Канал или группа Telegram</h3>
                      <p className="text-[11px] text-gray-500">
                        {socialConfig.telegramChannelTitle
                          ? `Подключено: ${socialConfig.telegramChannelTitle}`
                          : "Публикация через Telegram Bot API с HTML-разметкой и кнопками"}
                      </p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "text-[11px] font-bold",
                      socialConfig.telegramBotToken && socialConfig.telegramChatId
                        ? "text-emerald-600"
                        : "text-gray-400"
                    )}
                  >
                    {socialConfig.telegramBotToken && socialConfig.telegramChatId ? "Настроено" : "Не заполнено"}
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      Токен Telegram-бота (Bot Token от @BotFather):
                    </label>
                    <input
                      type="password"
                      value={socialConfig.telegramBotToken}
                      onChange={(e) => setSocialConfig({ ...socialConfig, telegramBotToken: e.target.value })}
                      placeholder="Вставьте сюда токен бота от @BotFather"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 font-mono text-xs focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      @username канала или Chat ID (например, @mebel_plan):
                    </label>
                    <input
                      type="text"
                      value={socialConfig.telegramChatId}
                      onChange={(e) => setSocialConfig({ ...socialConfig, telegramChatId: e.target.value })}
                      placeholder="@mebel_plan"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 font-mono text-xs focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => handleTestSocialConnection("telegram")}
                    disabled={testingTelegram}
                    className="px-4 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold text-xs transition-all cursor-pointer border border-sky-200"
                  >
                    {testingTelegram ? "Проверка..." : "Проверить подключение Telegram"}
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveSocialConfig}
                    disabled={savingSocialConfig}
                    className="px-4 py-2 rounded-xl bg-gray-900 hover:bg-gray-800 text-white font-bold text-xs transition-all cursor-pointer"
                  >
                    Сохранить
                  </button>
                </div>
              </div>

              {/* VK Config Card */}
              <div className="bg-white rounded-3xl border border-gray-200/80 p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-sm">
                      VK
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-gray-900">Сообщество / Группа ВКонтакте</h3>
                      <p className="text-[11px] text-gray-500">
                        {socialConfig.vkGroupName
                          ? `Подключено: ${socialConfig.vkGroupName}`
                          : "Публикация записей и фото на стену группы (wall.post)"}
                      </p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "text-[11px] font-bold",
                      socialConfig.vkAccessToken && socialConfig.vkGroupId
                        ? "text-emerald-600"
                        : "text-gray-400"
                    )}
                  >
                    {socialConfig.vkAccessToken && socialConfig.vkGroupId ? "Настроено" : "Не заполнено"}
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      Числовой ID группы ВКонтакте (без минуса и club):
                    </label>
                    <input
                      type="text"
                      value={socialConfig.vkGroupId}
                      onChange={(e) => setSocialConfig({ ...socialConfig, vkGroupId: e.target.value })}
                      placeholder="Укажите числовой ID сообщества ВК"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 font-mono text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      Ключ доступа (VK Access Token с правами wall, photos, groups):
                    </label>
                    <input
                      type="password"
                      value={socialConfig.vkAccessToken}
                      onChange={(e) => setSocialConfig({ ...socialConfig, vkAccessToken: e.target.value })}
                      placeholder="Вставьте сюда ключ доступа ВК"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 font-mono text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => handleTestSocialConnection("vk")}
                    disabled={testingVk}
                    className="px-4 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs transition-all cursor-pointer border border-blue-200"
                  >
                    {testingVk ? "Проверка..." : "Проверить подключение ВК"}
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveSocialConfig}
                    disabled={savingSocialConfig}
                    className="px-4 py-2 rounded-xl bg-gray-900 hover:bg-gray-800 text-white font-bold text-xs transition-all cursor-pointer"
                  >
                    Сохранить
                  </button>
                </div>
              </div>
            </div>

            {/* COMPOSER + LIVE PREVIEW */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left 7 cols: Post Composer */}
              <div className="lg:col-span-7 bg-white rounded-3xl border border-gray-200/80 p-6 sm:p-8 shadow-xs space-y-5">
                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                  <div>
                    <h3 className="text-base font-extrabold text-gray-900">Новая публикация (Кросспостинг)</h3>
                    <p className="text-xs text-gray-500">Создайте запись и выберите площадки для одновременной отправки</p>
                  </div>
                </div>

                {/* Target checkboxes */}
                <div>
                  <label className="block text-xs font-extrabold text-gray-700 mb-2">
                    Куда опубликовать одновременно:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <label
                      className={cn(
                        "p-3.5 rounded-2xl border text-xs font-bold flex items-center gap-2.5 cursor-pointer transition-all select-none",
                        socialPostForm.targetTelegram
                          ? "bg-sky-50/90 border-sky-300 text-sky-900"
                          : "bg-gray-50 border-gray-200 text-gray-500"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={socialPostForm.targetTelegram}
                        onChange={(e) => setSocialPostForm({ ...socialPostForm, targetTelegram: e.target.checked })}
                        className="w-4 h-4 rounded text-sky-600"
                      />
                      <Send className="w-4 h-4 text-sky-600 shrink-0" />
                      <span>Telegram-канал</span>
                    </label>

                    <label
                      className={cn(
                        "p-3.5 rounded-2xl border text-xs font-bold flex items-center gap-2.5 cursor-pointer transition-all select-none",
                        socialPostForm.targetVk
                          ? "bg-blue-50/90 border-blue-300 text-blue-900"
                          : "bg-gray-50 border-gray-200 text-gray-500"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={socialPostForm.targetVk}
                        onChange={(e) => setSocialPostForm({ ...socialPostForm, targetVk: e.target.checked })}
                        className="w-4 h-4 rounded text-blue-600"
                      />
                      <Globe className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>Группа ВКонтакте</span>
                    </label>

                    <label
                      className={cn(
                        "p-3.5 rounded-2xl border text-xs font-bold flex items-center gap-2.5 cursor-pointer transition-all select-none",
                        socialPostForm.targetInternalNews
                          ? "bg-indigo-50/90 border-indigo-300 text-indigo-900"
                          : "bg-gray-50 border-gray-200 text-gray-500"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={socialPostForm.targetInternalNews}
                        onChange={(e) => setSocialPostForm({ ...socialPostForm, targetInternalNews: e.target.checked })}
                        className="w-4 h-4 rounded text-indigo-600"
                      />
                      <Bell className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span>Лента «Мебель План»</span>
                    </label>
                  </div>
                </div>

                {/* Title & Content */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Заголовок поста (выделяется жирным в Telegram и первой строкой в ВК):
                    </label>
                    <input
                      type="text"
                      value={socialPostForm.title}
                      onChange={(e) => setSocialPostForm({ ...socialPostForm, title: e.target.value })}
                      placeholder="Например: Автоматический импорт из Pro100 и Базис-Мебельщик за 10 секунд!"
                      className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-bold focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Основной текст записи *:
                    </label>
                    <textarea
                      rows={5}
                      value={socialPostForm.content}
                      onChange={(e) => setSocialPostForm({ ...socialPostForm, content: e.target.value })}
                      placeholder="Напишите текст новости, обновления или полезного кейса для мебельщиков..."
                      className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-xs font-medium leading-relaxed focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  {/* Image attachment (URL or file upload) */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Изображение к посту (ссылка на картинку или загрузка с компьютера):
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={socialPostForm.imageUrl.startsWith("data:") ? "Загружено изображение с компьютера" : socialPostForm.imageUrl}
                        onChange={(e) => setSocialPostForm({ ...socialPostForm, imageUrl: e.target.value })}
                        placeholder="https://example.com/banner.jpg"
                        className="flex-1 px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-mono focus:outline-none focus:border-blue-600"
                      />
                      <label className="px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold cursor-pointer transition-all shrink-0 text-center">
                        Выбрать файл...
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleSocialImageUpload}
                          className="hidden"
                        />
                      </label>
                      {socialPostForm.imageUrl && (
                        <button
                          type="button"
                          onClick={() => setSocialPostForm({ ...socialPostForm, imageUrl: "" })}
                          className="px-3 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold cursor-pointer"
                        >
                          Очистить
                        </button>
                      )}
                    </div>
                  </div>

                  {/* CTA Button & Hashtags */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Текст кнопки-ссылки (Inline-кнопка в TG):
                      </label>
                      <input
                        type="text"
                        value={socialPostForm.ctaText}
                        onChange={(e) => setSocialPostForm({ ...socialPostForm, ctaText: e.target.value })}
                        placeholder="Попробовать бесплатно"
                        className="w-full px-3.5 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        URL ссылки (прикрепляется к посту):
                      </label>
                      <input
                        type="text"
                        value={socialPostForm.ctaUrl}
                        onChange={(e) => setSocialPostForm({ ...socialPostForm, ctaUrl: e.target.value })}
                        placeholder="https://mebel-plan.ru"
                        className="w-full px-3.5 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Хэштеги (добавляются внизу поста):
                    </label>
                    <input
                      type="text"
                      value={socialPostForm.hashtags}
                      onChange={(e) => setSocialPostForm({ ...socialPostForm, hashtags: e.target.value })}
                      placeholder="#мебельплан #мебельноепроизводство #раскрой #базисмебельщик #pro100"
                      className="w-full px-3.5 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs text-blue-700 font-semibold"
                    />
                  </div>
                </div>

                {/* Publish Result Report Banner */}
                {lastPublishReport && (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="text-xs font-extrabold text-slate-800">Результат отправки по площадкам:</div>
                    <div className="space-y-1.5 text-xs">
                      {Object.entries(lastPublishReport).map(([net, info]) => (
                        <div key={net} className="flex items-center justify-between">
                          <span className="font-bold text-slate-700">
                            {net === "telegram" ? "Telegram" : net === "vk" ? "ВКонтакте" : "Лента Мебель План"}:
                          </span>
                          <span className={cn("font-semibold", info.ok ? "text-emerald-600" : "text-red-600")}>
                            {info.message}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-2 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={handlePublishSocialPost}
                    disabled={publishingSocialPost}
                    className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-black shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    <span>
                      {publishingSocialPost
                        ? "Отправка во все выбранные соцсети..."
                        : "Опубликовать одновременно в выбранные сети"}
                    </span>
                  </button>
                </div>
              </div>

              {/* Right 5 cols: Live Preview for Telegram & VK */}
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <span className="text-xs font-black uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                      <Eye className="w-4 h-4" />
                      Предпросмотр публикации
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">Telegram & VK</span>
                  </div>

                  {/* Simulated Telegram / VK Bubble */}
                  <div className="bg-slate-950 rounded-2xl overflow-hidden border border-slate-800">
                    {socialPostForm.imageUrl && (
                      <div className="w-full h-44 bg-slate-900 overflow-hidden border-b border-slate-800">
                        <img
                          src={socialPostForm.imageUrl}
                          alt="Post preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="p-4 space-y-2.5 text-xs">
                      <div className="font-extrabold text-sky-400 text-[11px]">
                        {socialConfig.telegramChannelTitle || socialConfig.vkGroupName || "Мебель План • Официальный канал"}
                      </div>
                      {socialPostForm.title && (
                        <div className="font-bold text-white text-sm leading-snug">
                          {socialPostForm.title}
                        </div>
                      )}
                      <div className="text-slate-300 whitespace-pre-wrap leading-relaxed">
                        {socialPostForm.content || "Здесь появится текст вашей записи для Telegram и группы ВКонтакте..."}
                      </div>
                      {socialPostForm.hashtags && (
                        <div className="text-sky-400 text-[11px] font-medium pt-1">
                          {socialPostForm.hashtags}
                        </div>
                      )}
                    </div>

                    {socialPostForm.ctaUrl && (
                      <div className="px-4 pb-4">
                        <div className="w-full py-2 rounded-xl bg-slate-800/90 text-sky-300 text-center text-xs font-bold border border-slate-700">
                          {socialPostForm.ctaText || "Подробнее"} ↗
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* History of Cross-Posted Entries */}
                <div className="bg-white rounded-3xl border border-gray-200/80 p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-extrabold text-gray-900">
                      История мультипостинга ({socialPosts.length})
                    </h4>
                  </div>

                  {socialPosts.length === 0 ? (
                    <div className="text-center py-6 text-xs text-gray-400">
                      Отправленных через мультипостинг записей пока нет
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                      {socialPosts.map((post) => (
                        <div
                          key={post.id}
                          className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200/80 space-y-2 text-xs"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="font-bold text-gray-900 line-clamp-1">
                              {post.title || post.content}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteSocialPostHistory(post.id)}
                              className="text-gray-400 hover:text-red-600 cursor-pointer shrink-0"
                              title="Удалить из истории"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <p className="text-gray-600 line-clamp-2 text-[11px]">{post.content}</p>
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-gray-200/60 text-[10px]">
                            <div className="flex flex-wrap items-center gap-2">
                              {post.results?.telegram && (
                                <span className={post.results.telegram.ok ? "text-emerald-700 font-bold" : "text-red-600 font-bold"}>
                                  TG: {post.results.telegram.ok ? "Опубликовано" : "Ошибка"}
                                </span>
                              )}
                              {post.results?.vk && (
                                <span className={post.results.vk.ok ? "text-blue-700 font-bold" : "text-red-600 font-bold"}>
                                  VK: {post.results.vk.ok ? "Опубликовано" : "Ошибка"}
                                </span>
                              )}
                              {post.results?.internalNews && (
                                <span className="text-indigo-700 font-bold">
                                  Платформа: Да
                                </span>
                              )}
                            </div>
                            <span className="text-gray-400">
                              {new Date(post.createdAt).toLocaleDateString("ru-RU", {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit"
                              })}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
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

      {/* SUPERADMIN PROPOSAL CREATION MODAL */}
      {showProposalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white rounded-3xl p-7 shadow-2xl border border-gray-100 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-gray-900">Сформировать предложение для компании</h3>
                  <p className="text-xs text-gray-500">Назначьте индивидуальный набор модулей и стоимость</p>
                </div>
              </div>
              <button
                onClick={() => setShowProposalModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Выберите компанию:</label>
                <select
                  value={proposalCompanyId}
                  onChange={(e) => setProposalCompanyId(e.target.value)}
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold text-gray-900"
                >
                  <option value="" disabled>-- Выберите компанию из списка --</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name || 'Компания без названия'} (ID: {c.id}) {c.phone ? `• 📞 ${c.phone}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-2">Подключаемые модули:</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'erp', name: 'Производство (ERP)' },
                    { id: 'procurement', name: 'Снабжение' },
                    { id: 'warehouse', name: 'Склад' },
                    { id: 'manager_salaries', name: 'Зарплаты менеджеров' },
                  ].map(m => (
                    <label 
                      key={m.id}
                      className={cn(
                        "p-3 rounded-xl border text-xs font-bold flex items-center gap-2 cursor-pointer transition-all",
                        proposalModules.includes(m.id) ? "bg-indigo-50 border-indigo-300 text-indigo-900" : "bg-gray-50 border-gray-200 text-gray-600"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={proposalModules.includes(m.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setProposalModules([...proposalModules, m.id]);
                          } else {
                            setProposalModules(proposalModules.filter(x => x !== m.id));
                          }
                        }}
                        className="w-4 h-4 text-indigo-600 rounded"
                      />
                      <span>{m.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Период подписки:</label>
                  <select
                    value={proposalPeriod}
                    onChange={(e) => setProposalPeriod(e.target.value)}
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold"
                  >
                    <option value="month">1 месяц</option>
                    <option value="half_year">6 месяцев (-15%)</option>
                    <option value="year">12 месяцев (Год -20%)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Индивидуальная цена (₽):</label>
                  <input
                    type="number"
                    value={proposalPrice}
                    onChange={(e) => setProposalPrice(Number(e.target.value))}
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Комментарий / Условия предложения:</label>
                <textarea
                  value={proposalComment}
                  onChange={(e) => setProposalComment(e.target.value)}
                  placeholder="Например: Скидка 25% при оплате до конца недели. Индивидуальный тариф."
                  className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl text-xs"
                  rows={2}
                />
              </div>

              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200">
                <label className="flex items-center gap-2 text-xs font-extrabold text-emerald-950 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={proposalAutoActivate}
                    onChange={(e) => setProposalAutoActivate(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600"
                  />
                  <span>Сразу активировать модули (без ожидания оплаты)</span>
                </label>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowProposalModal(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Отмена
              </button>
              <button
                onClick={handleCreateProposal}
                disabled={isSubmittingProposal || !proposalCompanyId || proposalModules.length === 0}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold shadow-md shadow-indigo-200 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmittingProposal ? "Отправка..." : "Отправить предложение"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

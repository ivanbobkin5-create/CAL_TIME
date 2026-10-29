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
import { DEFAULT_SYSTEM_BRANDS, SystemBrandItem } from "../../constants/systemBrands";

export interface CompanyApplication {
  id: string;
  companyId: string;
  companyName: string;
  type: "erp_access" | "bitrix_integration" | "production_partnership" | "brand_request" | "supplier_partner_request" | "general" | "custom";
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
  brandRequestData?: {
    brand: string;
    type: "ЛДСП" | "МДФ" | "ХДФ";
    width?: number;
    height?: number;
    format?: string;
    thicknesses?: string[];
    comment?: string;
  };
  partnerRequestData?: {
    role: "brand_representative" | "dealer";
    companyName: string;
    brands: string[];
    city?: string;
    contactName?: string;
    email?: string;
    phone?: string;
    comment?: string;
  };
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

export interface AppAdminViewProps {
  activeTab?: "overview" | "companies" | "applications" | "brands" | "partners" | "news" | "socials" | "users" | "notifications" | "requisites" | "database";
  onTabChange?: (tab: "overview" | "companies" | "applications" | "brands" | "partners" | "news" | "socials" | "users" | "notifications" | "requisites" | "database") => void;
  hideTopNav?: boolean;
}

export const AppAdminView: React.FC<AppAdminViewProps> = ({
  activeTab: externalActiveTab,
  onTabChange,
  hideTopNav = false,
}) => {
  const [internalActiveTab, setInternalActiveTab] = useState<
    "overview" | "companies" | "applications" | "brands" | "partners" | "news" | "socials" | "users" | "notifications" | "requisites" | "database"
  >("overview");

  const activeTab = externalActiveTab || internalActiveTab;

  const setActiveTab = (
    tab: "overview" | "companies" | "applications" | "brands" | "partners" | "news" | "socials" | "users" | "notifications" | "requisites" | "database"
  ) => {
    setInternalActiveTab(tab);
    if (onTabChange) {
      onTabChange(tab);
    }
  };
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [newsList, setNewsList] = useState<SystemNewsItem[]>([]);
  const [applications, setApplications] = useState<CompanyApplication[]>([]);
  const [moduleRequests, setModuleRequests] = useState<any[]>([]);
  const [appTypeTab, setAppTypeTab] = useState<"module_requests" | "company_apps">("module_requests");
  const [totalProjectsCount, setTotalProjectsCount] = useState<number>(0);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Global System Material Brands Catalog State
  const [systemBrands, setSystemBrands] = useState<SystemBrandItem[]>(DEFAULT_SYSTEM_BRANDS);
  const [brandSearchQuery, setBrandSearchQuery] = useState("");
  const [brandTypeFilter, setBrandTypeFilter] = useState<"all" | "ЛДСП" | "МДФ" | "ХДФ">("all");
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [editingBrandItem, setEditingBrandItem] = useState<SystemBrandItem | null>(null);
  const [linkedBrandRequestApp, setLinkedBrandRequestApp] = useState<CompanyApplication | null>(null);
  const [brandForm, setBrandForm] = useState<{
    brand: string;
    type: "ЛДСП" | "МДФ" | "ХДФ";
    width: number;
    height: number;
    thicknessesStr: string;
    edgeBrandsStr: string;
    description: string;
  }>({
    brand: "",
    type: "ЛДСП",
    width: 2800,
    height: 2070,
    thicknessesStr: "10, 16, 22, 25",
    edgeBrandsStr: "",
    description: "",
  });
  const [savingBrand, setSavingBrand] = useState(false);
  
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

  // Partner & Brand Representative Ecosystem State
  const [partnerEcosystem, setPartnerEcosystem] = useState<{
    partners: any[];
    masterProducts: any[];
    invites: any[];
  }>({ partners: [], masterProducts: [], invites: [] });
  const [showPartnerInviteModal, setShowPartnerInviteModal] = useState(false);
  const [linkedPartnerApp, setLinkedPartnerApp] = useState<CompanyApplication | null>(null);
  const [partnerInviteForm, setPartnerInviteForm] = useState({
    email: "",
    companyName: "",
    contactName: "",
    phone: "",
    city: "Москва",
    role: "brand_representative" as "brand_representative" | "dealer",
    selectedBrands: [] as string[],
    customBrandInput: "",
  });
  const [partnerInviteGenerating, setPartnerInviteGenerating] = useState(false);
  const [generatedPartnerInviteLink, setGeneratedPartnerInviteLink] = useState("");

  const availableSelectableBrands = useMemo(() => {
    const hardwareAndAccessoriesBrands = [
      "Boyard",
      "Blum",
      "Hettich",
      "GTV",
      "Hafele",
      "Firmax",
      "Aristo",
      "Premial",
      "Omoikiri",
      "Granfest",
      "Florentina",
      "Rehau",
      "Galoplast",
    ];
    const fromSystem = systemBrands.map((b) => b.brand);
    return Array.from(new Set([...fromSystem, ...hardwareAndAccessoriesBrands]));
  }, [systemBrands]);

  const openPartnerInviteModalForApp = (app?: CompanyApplication) => {
    setGeneratedPartnerInviteLink("");
    if (app) {
      setLinkedPartnerApp(app);
      setPartnerInviteForm({
        email: app.partnerRequestData?.email || app.contactEmail || "",
        companyName: app.partnerRequestData?.companyName || app.companyName || "",
        contactName: app.partnerRequestData?.contactName || app.contactName || "",
        phone: app.partnerRequestData?.phone || app.contactPhone || "",
        city: app.partnerRequestData?.city || "Москва",
        role: app.partnerRequestData?.role || "brand_representative",
        selectedBrands: app.partnerRequestData?.brands || [],
        customBrandInput: "",
      });
    } else {
      setLinkedPartnerApp(null);
      setPartnerInviteForm({
        email: "",
        companyName: "",
        contactName: "",
        phone: "",
        city: "Москва",
        role: "brand_representative",
        selectedBrands: [],
        customBrandInput: "",
      });
    }
    setShowPartnerInviteModal(true);
  };

  const handleGeneratePartnerInvite = async () => {
    if (!partnerInviteForm.email.trim() || !partnerInviteForm.companyName.trim()) {
      showToast("Укажите E-mail и название компании партнера", "error");
      return;
    }
    setPartnerInviteGenerating(true);
    try {
      const res = await fetch("/api/partner/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: partnerInviteForm.email.trim(),
          companyName: partnerInviteForm.companyName.trim(),
          contactName: partnerInviteForm.contactName.trim(),
          phone: partnerInviteForm.phone.trim(),
          city: partnerInviteForm.city.trim(),
          role: partnerInviteForm.role,
          managedBrands:
            partnerInviteForm.selectedBrands.length > 0
              ? partnerInviteForm.selectedBrands
              : [partnerInviteForm.companyName.trim()],
          applicationId: linkedPartnerApp?.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Ошибка создания приглашения");
      }
      const fullLink = `${window.location.origin}${data.inviteUrl}`;
      setGeneratedPartnerInviteLink(fullLink);
      showToast("Кабинет партнера создан, ссылка-приглашение сформирована!");
      loadSystemData();
    } catch (err: any) {
      showToast(err.message || "Не удалось создать приглашение", "error");
    } finally {
      setPartnerInviteGenerating(false);
    }
  };

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
      let loadedApps: any[] = [];
      if (appRes.ok) {
        const appData = await appRes.json();
        if (appData.applications && Array.isArray(appData.applications)) {
          loadedApps = appData.applications;
        }
      }
      try {
        const pending = JSON.parse(localStorage.getItem("pending_company_applications") || "[]");
        if (Array.isArray(pending) && pending.length > 0) {
          const existingIds = new Set(loadedApps.map((a: any) => a.id));
          const missing = pending.filter((a: any) => !existingIds.has(a.id));
          if (missing.length > 0) {
            loadedApps = [...missing, ...loadedApps];
            missing.forEach((item: any) => {
              fetch("/api/system/applications", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(item),
              }).catch(() => {});
            });
          }
        }
      } catch (_) {}
      setApplications(loadedApps);

      // 4a. Load System Material Brands Catalog
      try {
        const brandsRes = await fetch("/api/system/brands");
        if (brandsRes.ok) {
          const brandsData = await brandsRes.json();
          if (Array.isArray(brandsData.brands) && brandsData.brands.length > 0) {
            setSystemBrands(brandsData.brands);
          }
        }
      } catch (_) {}

      // 4a-2. Load Partner & Brand Representative Ecosystem
      try {
        const ecoRes = await fetch("/api/partner/ecosystem");
        if (ecoRes.ok) {
          const ecoData = await ecoRes.json();
          setPartnerEcosystem({
            partners: Array.isArray(ecoData.partners) ? ecoData.partners : [],
            masterProducts: Array.isArray(ecoData.masterProducts) ? ecoData.masterProducts : [],
            invites: Array.isArray(ecoData.invites) ? ecoData.invites : [],
          });
        }
      } catch (_) {}

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

  // Open Brand Modal (for new brand, editing existing brand, or verifying a company's brand_request)
  const openBrandModalForApp = (app: CompanyApplication) => {
    const reqData = app.brandRequestData || {
      brand: app.title.replace(/^Заявка на бренд:\s*/i, "").trim(),
      type: "ЛДСП" as const,
      width: 2800,
      height: 2070,
      format: "2800x2070",
      thicknesses: ["16"],
      comment: app.message || "",
    };
    let w = Number(reqData.width) || 2800;
    let h = Number(reqData.height) || 2070;
    if (reqData.format && (!reqData.width || !reqData.height)) {
      const parts = String(reqData.format).toLowerCase().replace(/[×*х]/g, "x").split("x").map(n => parseInt(n.trim(), 10));
      if (parts.length >= 2 && parts[0] > 100 && parts[1] > 100) {
        w = parts[0];
        h = parts[1];
      }
    }
    setEditingBrandItem(null);
    setLinkedBrandRequestApp(app);
    setBrandForm({
      brand: reqData.brand || "",
      type: reqData.type || "ЛДСП",
      width: w,
      height: h,
      thicknessesStr: Array.isArray(reqData.thicknesses) && reqData.thicknesses.length > 0 ? reqData.thicknesses.join(", ") : "16",
      edgeBrandsStr: reqData.brand || "",
      description: reqData.comment ? `Добавлено по заявке компании «${app.companyName}»` : "",
    });
    setShowBrandModal(true);
  };

  const handleSaveSystemBrand = async () => {
    const cleanBrand = brandForm.brand.trim();
    if (!cleanBrand) {
      showToast("Укажите название бренда", "error");
      return;
    }
    const cleanW = Number(brandForm.width) || 2800;
    const cleanH = Number(brandForm.height) || 2070;
    const thicknesses = brandForm.thicknessesStr
      .split(/[,;\s]+/)
      .map(s => s.replace(/мм/gi, "").trim())
      .filter(Boolean);
    const edgeBrands = brandForm.edgeBrandsStr
      .split(/[,;]+/)
      .map(s => s.trim())
      .filter(Boolean);

    setSavingBrand(true);
    try {
      const brandItem: SystemBrandItem = {
        id: editingBrandItem?.id || `sys_${brandForm.type === "ЛДСП" ? "ldsp" : brandForm.type === "МДФ" ? "mdf" : "hdf"}_${Date.now()}`,
        brand: cleanBrand,
        type: brandForm.type,
        format: `${cleanW}x${cleanH}`,
        width: cleanW,
        height: cleanH,
        thicknesses: thicknesses.length > 0 ? thicknesses : ["16"],
        edgeBrands,
        description: brandForm.description.trim(),
      };

      const res = await fetch("/api/system/brands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandItem }),
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.brands)) {
          setSystemBrands(data.brands);
        }

        // If linked to a company's brand_request application, mark it approved and auto-attach to the company's production settings
        if (linkedBrandRequestApp) {
          await handleUpdateApplicationStatus(linkedBrandRequestApp, "approved");
          try {
            const prodPath = `/api/db/doc/companies/${linkedBrandRequestApp.companyId}/settings/production`;
            const prodRes = await fetch(prodPath);
            const prodData = prodRes.ok ? await prodRes.json() : {};
            const existingBrands = Array.isArray(prodData?.ldspBrands) ? prodData.ldspBrands : [];
            const alreadyInCompany = existingBrands.some(
              (b: any) => String(b.brand || "").toLowerCase() === cleanBrand.toLowerCase() && b.type === brandForm.type
            );
            if (!alreadyInCompany) {
              const updatedLdspBrands = [
                ...existingBrands,
                {
                  id: brandItem.id,
                  brand: brandItem.brand,
                  format: brandItem.format,
                  type: brandItem.type,
                  thicknesses: brandItem.thicknesses,
                },
              ];
              await fetch(prodPath, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  data: { ...(prodData || {}), ldspBrands: updatedLdspBrands },
                  merge: true,
                }),
              });
            }
          } catch (_) {}
          showToast(`Бренд «${cleanBrand}» внесен в систему и добавлен компании «${linkedBrandRequestApp.companyName}»!`);
        } else {
          showToast(editingBrandItem ? `Бренд «${cleanBrand}» обновлен!` : `Бренд «${cleanBrand}» добавлен в каталог системы!`);
        }

        setShowBrandModal(false);
        setEditingBrandItem(null);
        setLinkedBrandRequestApp(null);
      } else {
        showToast("Не удалось сохранить бренд", "error");
      }
    } catch {
      showToast("Ошибка сети при сохранении бренда", "error");
    } finally {
      setSavingBrand(false);
    }
  };

  const handleDeleteSystemBrand = async (brand: SystemBrandItem) => {
    try {
      const res = await fetch(`/api/system/brands/${encodeURIComponent(brand.id)}`, { method: "DELETE" });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.brands)) {
          setSystemBrands(data.brands);
        } else {
          setSystemBrands(prev => prev.filter(b => b.id !== brand.id));
        }
        showToast(`Бренд «${brand.brand}» удален из системы`);
      }
    } catch {
      showToast("Ошибка при удалении бренда", "error");
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
        {!hideTopNav && (
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
              onClick={() => setActiveTab("brands")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap relative",
                activeTab === "brands"
                  ? "bg-white text-blue-700 shadow-sm border border-gray-200 font-extrabold"
                  : "text-gray-600 hover:text-gray-900"
              )}
            >
              <Layers className="w-4 h-4" />
              <span>Каталог брендов ({systemBrands.length})</span>
              {applications.filter(a => a.type === "brand_request" && a.status === "pending").length > 0 && (
                <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center font-black">
                  {applications.filter(a => a.type === "brand_request" && a.status === "pending").length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("partners")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap relative",
                activeTab === "partners"
                  ? "bg-white text-blue-700 shadow-sm border border-gray-200 font-extrabold"
                  : "text-gray-600 hover:text-gray-900"
              )}
            >
              <Truck className="w-4 h-4" />
              <span>Поставщики и Бренды ({partnerEcosystem.partners.length})</span>
              {applications.filter(a => a.type === "supplier_partner_request" && a.status === "pending").length > 0 && (
                <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center font-black">
                  {applications.filter(a => a.type === "supplier_partner_request" && a.status === "pending").length}
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
        )}

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
                            {app.type === "brand_request" ? (
                              <button
                                onClick={() => openBrandModalForApp(app)}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                              >
                                <Layers className="w-4 h-4" />
                                <span>Проверить и внести бренд в систему</span>
                              </button>
                            ) : app.type === "supplier_partner_request" ? (
                              <button
                                onClick={() => openPartnerInviteModalForApp(app)}
                                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-extrabold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                              >
                                <Send className="w-4 h-4" />
                                <span>Создать кабинет и пригласить</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleUpdateApplicationStatus(app, "approved")}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                              >
                                <Check className="w-4 h-4" />
                                <span>Одобрить доступ</span>
                              </button>
                            )}
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

        {/* TAB: GLOBAL SYSTEM MATERIAL BRANDS CATALOG */}
        {activeTab === "brands" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Header */}
            <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <Layers className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-gray-900">Единый каталог брендов плитных материалов</h2>
                  <p className="text-xs text-gray-500">
                    Производства выбирают бренды только из этого системного справочника, ограничивая работу своих менеджеров разрешенными брендами и форматами листов
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setEditingBrandItem(null);
                  setLinkedBrandRequestApp(null);
                  setBrandForm({
                    brand: "",
                    type: "ЛДСП",
                    width: 2800,
                    height: 2070,
                    thicknessesStr: "10, 16, 22, 25",
                    edgeBrandsStr: "",
                    description: "",
                  });
                  setShowBrandModal(true);
                }}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all shadow-sm shadow-blue-200 cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Добавить бренд в систему</span>
              </button>
            </div>

            {/* Incoming Brand Requests from Companies */}
            {applications.filter(a => a.type === "brand_request" && a.status === "pending").length > 0 && (
              <div className="bg-amber-50/90 border border-amber-200 rounded-3xl p-6 space-y-4">
                <div className="flex items-center gap-2.5">
                  <Inbox className="w-5 h-5 text-amber-600" />
                  <h3 className="text-sm font-black text-amber-950 uppercase tracking-wider">
                    Новые заявки от производств на добавление бренда ({applications.filter(a => a.type === "brand_request" && a.status === "pending").length})
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {applications
                    .filter(a => a.type === "brand_request" && a.status === "pending")
                    .map(app => (
                      <div key={app.id} className="bg-white p-4 rounded-2xl border border-amber-200 shadow-2xs flex flex-col justify-between gap-3">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black uppercase">
                              Запрос бренда
                            </span>
                            <span className="text-[11px] text-gray-400">
                              {new Date(app.createdAt).toLocaleDateString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                          <h4 className="text-sm font-extrabold text-gray-900">{app.title}</h4>
                          {app.message && (
                            <p className="text-xs text-gray-600 bg-gray-50 p-2.5 rounded-xl border border-gray-100 whitespace-pre-line">{app.message}</p>
                          )}
                          <p className="text-[11px] text-gray-500">
                            От компании: <strong className="text-gray-800">{app.companyName}</strong> ({app.contactName || app.contactEmail || app.contactPhone || app.companyId})
                          </p>
                        </div>
                        <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                          <button
                            onClick={() => openBrandModalForApp(app)}
                            className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                          >
                            <Check className="w-4 h-4" />
                            <span>Проверить и внести в систему</span>
                          </button>
                          <button
                            onClick={() => handleUpdateApplicationStatus(app, "rejected")}
                            className="py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                          >
                            Отклонить
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Search & Type Filter */}
            <div className="bg-white p-4 rounded-3xl border border-gray-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Поиск по названию бренда, формату листа (например, Egger, Lamarty, 2800x2070)..."
                  value={brandSearchQuery}
                  onChange={e => setBrandSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-600"
                />
              </div>
              <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl">
                {(["all", "ЛДСП", "МДФ", "ХДФ"] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setBrandTypeFilter(t)}
                    className={cn(
                      "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                      brandTypeFilter === t ? "bg-white text-blue-600 shadow-2xs font-extrabold" : "text-gray-600 hover:text-gray-900"
                    )}
                  >
                    {t === "all" ? "Все типы" : t === "МДФ" ? "МДФ / Фасадные" : t}
                  </button>
                ))}
              </div>
            </div>

            {/* Brands Table */}
            <div className="bg-white rounded-3xl border border-gray-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-gray-100 text-[11px] font-black text-gray-400 uppercase tracking-wider">
                      <th className="py-3.5 px-5">Бренд материала</th>
                      <th className="py-3.5 px-4">Тип плиты</th>
                      <th className="py-3.5 px-4">Формат листа (Д×Ш)</th>
                      <th className="py-3.5 px-4">Доступные толщины</th>
                      <th className="py-3.5 px-4">Кромка</th>
                      <th className="py-3.5 px-5 text-right">Действия</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs">
                    {systemBrands
                      .filter(b => {
                        if (brandTypeFilter !== "all" && b.type !== brandTypeFilter) return false;
                        if (!brandSearchQuery.trim()) return true;
                        const q = brandSearchQuery.toLowerCase().trim();
                        return (
                          b.brand.toLowerCase().includes(q) ||
                          b.format.toLowerCase().includes(q) ||
                          b.type.toLowerCase().includes(q) ||
                          (b.description || "").toLowerCase().includes(q)
                        );
                      })
                      .map(b => (
                        <tr key={b.id} className="hover:bg-gray-50/60 transition-colors">
                          <td className="py-3.5 px-5">
                            <div className="font-extrabold text-gray-900 text-sm">{b.brand}</div>
                            {b.description && <div className="text-[11px] text-gray-400 mt-0.5">{b.description}</div>}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={cn(
                                "px-2.5 py-1 rounded-lg text-[11px] font-extrabold",
                                b.type === "ЛДСП"
                                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                                  : b.type === "МДФ"
                                    ? "bg-purple-50 text-purple-700 border border-purple-200"
                                    : "bg-amber-50 text-amber-700 border border-amber-200"
                              )}
                            >
                              {b.type}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-gray-800">
                            {b.width} × {b.height} мм
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex flex-wrap gap-1">
                              {(b.thicknesses || ["16"]).map(th => (
                                <span key={th} className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md font-bold text-[11px]">
                                  {th} мм
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-gray-500">
                            {b.edgeBrands && b.edgeBrands.length > 0 ? b.edgeBrands.join(", ") : "Стандарт"}
                          </td>
                          <td className="py-3.5 px-5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setEditingBrandItem(b);
                                  setLinkedBrandRequestApp(null);
                                  setBrandForm({
                                    brand: b.brand,
                                    type: b.type,
                                    width: b.width,
                                    height: b.height,
                                    thicknessesStr: (b.thicknesses || ["16"]).join(", "),
                                    edgeBrandsStr: (b.edgeBrands || []).join(", "),
                                    description: b.description || "",
                                  });
                                  setShowBrandModal(true);
                                }}
                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer"
                                title="Редактировать параметры бренда"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteSystemBrand(b)}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                                title="Удалить бренд из каталога"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Modal for Adding / Editing System Brand */}
        {showBrandModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/60">
                <div>
                  <h3 className="text-base font-black text-gray-900">
                    {linkedBrandRequestApp
                      ? "Проверка и внесение бренда по заявке"
                      : editingBrandItem
                        ? "Редактирование бренда в каталоге"
                        : "Добавление бренда в каталог системы"}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {linkedBrandRequestApp
                      ? `Заявка от компании «${linkedBrandRequestApp.companyName}»`
                      : "Укажите точные параметры плиты и размеры листа"}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowBrandModal(false);
                    setEditingBrandItem(null);
                    setLinkedBrandRequestApp(null);
                  }}
                  className="p-2 text-gray-400 hover:text-gray-700 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block font-extrabold text-gray-700 mb-1.5">Название бренда *</label>
                    <input
                      type="text"
                      value={brandForm.brand}
                      onChange={e => setBrandForm(prev => ({ ...prev, brand: e.target.value }))}
                      placeholder="Например: Egger, Lamarty, AGT..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-blue-600 font-bold text-sm"
                    />
                  </div>
                  <div>
                    <label className="block font-extrabold text-gray-700 mb-1.5">Тип материала *</label>
                    <select
                      value={brandForm.type}
                      onChange={e => setBrandForm(prev => ({ ...prev, type: e.target.value as any }))}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-blue-600 font-bold text-sm bg-white"
                    >
                      <option value="ЛДСП">ЛДСП</option>
                      <option value="МДФ">МДФ (Фасадные)</option>
                      <option value="ХДФ">ХДФ / ДВП</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-extrabold text-gray-700 mb-1.5">Длина листа (мм) *</label>
                    <input
                      type="number"
                      value={brandForm.width}
                      onChange={e => setBrandForm(prev => ({ ...prev, width: parseInt(e.target.value, 10) || 0 }))}
                      placeholder="2800"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-blue-600 font-mono font-bold text-sm"
                    />
                  </div>
                  <div>
                    <label className="block font-extrabold text-gray-700 mb-1.5">Ширина листа (мм) *</label>
                    <input
                      type="number"
                      value={brandForm.height}
                      onChange={e => setBrandForm(prev => ({ ...prev, height: parseInt(e.target.value, 10) || 0 }))}
                      placeholder="2070"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-blue-600 font-mono font-bold text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-extrabold text-gray-700 mb-1.5">Доступные толщины (мм, через запятую)</label>
                  <input
                    type="text"
                    value={brandForm.thicknessesStr}
                    onChange={e => setBrandForm(prev => ({ ...prev, thicknessesStr: e.target.value }))}
                    placeholder="Например: 10, 16, 18, 22, 25"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-blue-600 font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-extrabold text-gray-700 mb-1.5">Совместимые бренды кромки (через запятую)</label>
                  <input
                    type="text"
                    value={brandForm.edgeBrandsStr}
                    onChange={e => setBrandForm(prev => ({ ...prev, edgeBrandsStr: e.target.value }))}
                    placeholder="Например: Egger, Rehau, Galoplast"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-blue-600 font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-extrabold text-gray-700 mb-1.5">Описание / примечание</label>
                  <input
                    type="text"
                    value={brandForm.description}
                    onChange={e => setBrandForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Краткое описание формата или производителя"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="p-6 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  onClick={() => {
                    setShowBrandModal(false);
                    setEditingBrandItem(null);
                    setLinkedBrandRequestApp(null);
                  }}
                  className="px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  onClick={handleSaveSystemBrand}
                  disabled={savingBrand}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>
                    {savingBrand
                      ? "Сохранение..."
                      : linkedBrandRequestApp
                        ? "Внести в систему и одобрить заявку"
                        : "Сохранить бренд"}
                  </span>
                </button>
              </div>
            </div>
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

        {/* TAB: SUPPLIERS & BRAND REPRESENTATIVES ECOSYSTEM */}
        {activeTab === "partners" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <Truck className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-gray-900">
                    Кабинеты поставщиков и представителей брендов
                  </h2>
                  <p className="text-xs text-gray-500">
                    Закрытая регистрация по приглашению. Прямые адреса брендов (<span className="font-mono font-bold text-gray-700">mebel-plan.ru/boyard</span>) и кабинеты партнеров (<span className="font-mono font-bold text-gray-700">mebel-plan.ru/partner/...</span>)
                  </p>
                </div>
              </div>

              <button
                onClick={() => openPartnerInviteModalForApp()}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all shadow-sm shadow-blue-200 cursor-pointer shrink-0"
              >
                <Send className="w-4 h-4" />
                <span>Пригласить представителя бренда / поставщика</span>
              </button>
            </div>

            {/* Incoming Supplier/Brand Applications */}
            {applications.filter((a) => a.type === "supplier_partner_request" && a.status === "pending").length > 0 && (
              <div className="bg-amber-50/90 border border-amber-200 rounded-3xl p-6 space-y-4">
                <div className="flex items-center gap-2.5">
                  <Inbox className="w-5 h-5 text-amber-600" />
                  <h3 className="text-sm font-black text-amber-950 uppercase tracking-wider">
                    Заявки от поставщиков и представителей брендов ({applications.filter((a) => a.type === "supplier_partner_request" && a.status === "pending").length})
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {applications
                    .filter((a) => a.type === "supplier_partner_request" && a.status === "pending")
                    .map((app) => (
                      <div key={app.id} className="bg-white p-4 rounded-2xl border border-amber-200 shadow-2xs flex flex-col justify-between gap-3">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black uppercase">
                              Заявка партнера
                            </span>
                            <span className="text-[11px] text-gray-400">
                              {new Date(app.createdAt).toLocaleDateString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                          <h4 className="text-sm font-extrabold text-gray-900">{app.title}</h4>
                          {app.message && (
                            <p className="text-xs text-gray-600 bg-gray-50 p-2.5 rounded-xl border border-gray-100 whitespace-pre-line">{app.message}</p>
                          )}
                          <div className="text-[11px] text-gray-500">
                            E-mail: <strong className="text-gray-900">{app.contactEmail}</strong> • Тел: <strong className="text-gray-900">{app.contactPhone}</strong>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                          <button
                            onClick={() => openPartnerInviteModalForApp(app)}
                            className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Создать кабинет и выслать приглашение</span>
                          </button>
                          <button
                            onClick={() => handleUpdateApplicationStatus(app, "rejected")}
                            className="py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                          >
                            Отклонить
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Partners List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {partnerEcosystem.partners.map((partner) => {
                const prodCount = partnerEcosystem.masterProducts.filter((m) => m.partnerId === partner.id).length;
                const pendingInvite = partnerEcosystem.invites.find(
                  (inv) => inv.partnerId === partner.id && inv.status === "pending" && !inv.isEmployeeInvite
                );
                return (
                  <div
                    key={partner.id}
                    className="bg-white rounded-3xl border border-gray-200/80 p-6 shadow-xs flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className="px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-black uppercase">
                            {partner.role === "brand_representative" ? "Представитель бренда" : "Официальный дилер / Поставщик"}
                          </span>
                          <h3 className="text-base font-black text-gray-900 mt-1">{partner.companyName}</h3>
                        </div>
                        <button
                          onClick={async () => {
                            const res = await fetch(`/api/partner/${encodeURIComponent(partner.id)}`, { method: "DELETE" });
                            if (res.ok) {
                              showToast("Кабинет партнера удален");
                              loadSystemData();
                            }
                          }}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                          title="Удалить кабинет партнера"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {(partner.managedBrands || []).map((b: string) => (
                          <span key={b} className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs font-extrabold">
                            Бренд: {b}
                          </span>
                        ))}
                      </div>

                      <div className="p-3 rounded-2xl bg-gray-50 border border-gray-100 space-y-1 text-xs">
                        <div>
                          Кабинет партнера:{" "}
                          <a
                            href={`/partner/${partner.partnerSlug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="font-mono font-bold text-blue-600 hover:underline"
                          >
                            mebel-plan.ru/partner/{partner.partnerSlug}
                          </a>
                        </div>
                        {(() => {
                          const raw = partner.brandSlugs;
                          const slugs: string[] = Array.isArray(raw)
                            ? raw
                            : (raw && typeof raw === "object"
                                ? Object.values(raw)
                                : (typeof raw === "string" ? raw.split(",") : []));
                          const cleanSlugs = slugs.map((s: any) => String(s || "").trim()).filter(Boolean);
                          if (cleanSlugs.length === 0) return null;
                          return (
                            <div>
                              Прямая бренд-ссылка:{" "}
                              {cleanSlugs.map((bs: string) => (
                                <a
                                  key={bs}
                                  href={`/${bs}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="font-mono font-bold text-indigo-600 hover:underline mr-2"
                                >
                                  mebel-plan.ru/{bs}
                                </a>
                              ))}
                            </div>
                          );
                        })()}
                        <div className="text-gray-500 pt-1">
                          E-mail владельца: <strong className="text-gray-800">{partner.ownerEmail || partner.email || "—"}</strong>
                        </div>
                      </div>

                      {pendingInvite && (
                        <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-2 text-xs">
                          <div className="truncate font-mono text-emerald-900">
                            Ссылка приглашения: /partner/invite/{pendingInvite.token}
                          </div>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(`${window.location.origin}/partner/invite/${pendingInvite.token}`);
                              showToast("Ссылка-приглашение скопирована!");
                            }}
                            className="px-3 py-1 rounded-lg bg-emerald-600 text-white font-bold shrink-0 cursor-pointer"
                          >
                            Копировать
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-3 text-xs">
                      <div className="text-gray-500">
                        Эталонных товаров: <strong className="text-gray-900">{prodCount}</strong> • Дилеров:{" "}
                        <strong className="text-gray-900">{(partner.dealers || []).length}</strong>
                      </div>
                      <a
                        href={`/partner/${partner.partnerSlug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-4 py-2 rounded-xl bg-gray-900 hover:bg-blue-600 text-white font-bold flex items-center gap-1.5 transition-colors"
                      >
                        <span>Открыть кабинет</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* MODAL: INVITE PARTNER / BRAND REPRESENTATIVE */}
        {showPartnerInviteModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl border border-gray-100 my-8">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                <div>
                  <h3 className="text-base font-black text-gray-900">
                    Приглашение поставщика / представителя бренда
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Создает закрытый кабинет и персональную ссылку для установки пароля
                  </p>
                </div>
                <button
                  onClick={() => setShowPartnerInviteModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-700 rounded-xl hover:bg-gray-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPartnerInviteForm((prev) => ({ ...prev, role: "brand_representative" }))}
                    className={cn(
                      "p-3 rounded-xl border text-left cursor-pointer transition-all",
                      partnerInviteForm.role === "brand_representative"
                        ? "border-blue-600 bg-blue-50/70 font-extrabold text-blue-950"
                        : "border-gray-200 hover:bg-gray-50 text-gray-700"
                    )}
                  >
                    <div>Представитель бренда / Завод</div>
                    <div className="text-[10px] font-normal text-gray-500 mt-0.5">
                      Прямой адрес mebel-plan.ru/бренд + каталог
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPartnerInviteForm((prev) => ({ ...prev, role: "dealer" }))}
                    className={cn(
                      "p-3 rounded-xl border text-left cursor-pointer transition-all",
                      partnerInviteForm.role === "dealer"
                        ? "border-blue-600 bg-blue-50/70 font-extrabold text-blue-950"
                        : "border-gray-200 hover:bg-gray-50 text-gray-700"
                    )}
                  >
                    <div>Официальный дилер / Поставщик</div>
                    <div className="text-[10px] font-normal text-gray-500 mt-0.5">
                      Мультибрендовый адрес mebel-plan.ru/partner/...
                    </div>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-extrabold text-gray-700 mb-1">Название компании / Представительства *</label>
                    <input
                      type="text"
                      value={partnerInviteForm.companyName}
                      onChange={(e) => setPartnerInviteForm((prev) => ({ ...prev, companyName: e.target.value }))}
                      placeholder="ООО Боярд / ТБМ-Урал"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 font-bold text-sm"
                    />
                  </div>
                  <div>
                    <label className="block font-extrabold text-gray-700 mb-1">E-mail для приглашения и входа *</label>
                    <input
                      type="email"
                      value={partnerInviteForm.email}
                      onChange={(e) => setPartnerInviteForm((prev) => ({ ...prev, email: e.target.value }))}
                      placeholder="partner@company.ru"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 font-bold text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-extrabold text-gray-700 mb-1">Контактное лицо</label>
                    <input
                      type="text"
                      value={partnerInviteForm.contactName}
                      onChange={(e) => setPartnerInviteForm((prev) => ({ ...prev, contactName: e.target.value }))}
                      placeholder="Иван Петров"
                      className="w-full px-3 py-2 rounded-xl border border-gray-200"
                    />
                  </div>
                  <div>
                    <label className="block font-extrabold text-gray-700 mb-1">Телефон</label>
                    <input
                      type="text"
                      value={partnerInviteForm.phone}
                      onChange={(e) => setPartnerInviteForm((prev) => ({ ...prev, phone: e.target.value }))}
                      placeholder="+7 (999) 000-00-00"
                      className="w-full px-3 py-2 rounded-xl border border-gray-200"
                    />
                  </div>
                  <div>
                    <label className="block font-extrabold text-gray-700 mb-1">Город / Регион</label>
                    <input
                      type="text"
                      value={partnerInviteForm.city}
                      onChange={(e) => setPartnerInviteForm((prev) => ({ ...prev, city: e.target.value }))}
                      placeholder="Москва / РФ"
                      className="w-full px-3 py-2 rounded-xl border border-gray-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-extrabold text-gray-700 mb-1.5">
                    Назначить управляемые бренды (из системного каталога плитных материалов и фурнитуры)
                  </label>
                  <div className="flex flex-wrap gap-1.5 p-3 rounded-2xl bg-gray-50 border border-gray-200 max-h-36 overflow-y-auto">
                    {availableSelectableBrands.map((bName) => {
                      const active = partnerInviteForm.selectedBrands.includes(bName);
                      return (
                        <button
                          key={bName}
                          type="button"
                          onClick={() => {
                            setPartnerInviteForm((prev) => ({
                              ...prev,
                              selectedBrands: active
                                ? prev.selectedBrands.filter((x) => x !== bName)
                                : [...prev.selectedBrands, bName],
                            }));
                          }}
                          className={cn(
                            "px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                            active
                              ? "bg-blue-600 text-white shadow-2xs"
                              : "bg-white border border-gray-200 text-gray-700 hover:border-blue-400"
                          )}
                        >
                          {bName}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="text"
                      value={partnerInviteForm.customBrandInput}
                      onChange={(e) => setPartnerInviteForm((prev) => ({ ...prev, customBrandInput: e.target.value }))}
                      placeholder="Или введите новый бренд (например, Makmart)..."
                      className="flex-1 px-3 py-2 rounded-xl border border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const val = partnerInviteForm.customBrandInput.trim();
                        if (!val) return;
                        setPartnerInviteForm((prev) => ({
                          ...prev,
                          selectedBrands: Array.from(new Set([...prev.selectedBrands, val])),
                          customBrandInput: "",
                        }));
                      }}
                      className="px-3.5 py-2 rounded-xl bg-gray-900 text-white font-bold cursor-pointer"
                    >
                      + Добавить
                    </button>
                  </div>
                </div>

                {generatedPartnerInviteLink && (
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2">
                    <div className="font-extrabold text-emerald-950">
                      Персональная ссылка-приглашение сформирована:
                    </div>
                    <div className="p-2.5 rounded-xl bg-white border border-emerald-200 font-mono text-[11px] break-all">
                      {generatedPartnerInviteLink}
                    </div>
                    <p className="text-[11px] text-emerald-800">
                      Отправьте эту ссылку представителю бренда — перейдя по ней, он задаст свой пароль и попадет в кабинет партнера.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(generatedPartnerInviteLink);
                        showToast("Ссылка-приглашение скопирована в буфер обмена!");
                      }}
                      className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold cursor-pointer"
                    >
                      Скопировать ссылку-приглашение
                    </button>
                  </div>
                )}
              </div>

              <div className="p-6 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowPartnerInviteModal(false)}
                  className="px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-100 cursor-pointer"
                >
                  Закрыть
                </button>
                <button
                  onClick={handleGeneratePartnerInvite}
                  disabled={partnerInviteGenerating}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>
                    {partnerInviteGenerating ? "Формирование..." : "Создать кабинет и получить ссылку"}
                  </span>
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

import React, { useState, useEffect, useMemo } from 'react';
import { AppIcon } from '../Common/AppIcon';
import {
  Building2,
  Sparkles,
  Package,
  MapPin,
  Users,
  Settings,
  Plus,
  Trash2,
  Edit,
  Check,
  X,
  Search,
  ExternalLink,
  Copy,
  CheckCircle2,
  AlertCircle,
  Globe,
  Phone,
  Mail,
  ShieldCheck,
  ArrowLeft,
  LogIn,
  LogOut,
  KeyRound,
  Tag,
  Layers,
  Star,
  Store,
  Link2,
  RefreshCw,
} from 'lucide-react';

export interface PartnerDealerEntry {
  id: string;
  city: string;
  companyName: string;
  address: string;
  phone: string;
  email?: string;
  website?: string;
  brands?: string[];
  isVerified?: boolean;
}

export function extractBrandSlugs(brandSlugs: any): string[] {
  if (!brandSlugs) return [];
  if (Array.isArray(brandSlugs)) return brandSlugs.map((s) => String(s || "").trim()).filter(Boolean);
  if (typeof brandSlugs === "object") return Object.values(brandSlugs).map((s) => String(s || "").trim()).filter(Boolean);
  if (typeof brandSlugs === "string") return brandSlugs.split(",").map((s) => s.trim()).filter(Boolean);
  return [];
}

export interface PartnerProfile {
  id: string;
  partnerSlug: string;
  brandSlugs?: string[] | Record<string, string>;
  companyName: string;
  role: 'brand_representative' | 'dealer';
  managedBrands: string[];
  logoUrl?: string;
  bannerUrl?: string;
  description?: string;
  city?: string;
  phone?: string;
  email?: string;
  website?: string;
  categories: string[];
  dealers: PartnerDealerEntry[];
  ownerUserId?: number;
  ownerEmail?: string;
  employees: {
    id: string;
    email: string;
    name: string;
    role: string;
    status: 'invited' | 'active';
    inviteToken?: string;
    createdAt: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface MasterBrandProduct {
  id: string;
  partnerId: string;
  brand: string;
  manufacturerArticle: string;
  name: string;
  category: string;
  unit: string;
  price: number;
  image?: string;
  images?: string[];
  description?: string;
  isNovelty?: boolean;
  specs?: Record<string, string>;
  updatedAt: string;
}

interface PartnerCabinetViewProps {
  initialSlug?: string;
  isDirectBrandUrl?: boolean;
  currentUser?: any;
  onExitToMain?: () => void;
}

export const PartnerCabinetView: React.FC<PartnerCabinetViewProps> = ({
  initialSlug,
  isDirectBrandUrl = false,
  currentUser,
  onExitToMain,
}) => {
  const pathname = window.location.pathname;
  const searchParams = new URLSearchParams(window.location.search);

  // Determine if this is an invite URL: /partner/invite/:token or ?partner_invite=:token
  const inviteTokenFromPath = useMemo(() => {
    if (pathname.startsWith('/partner/invite/')) {
      return pathname.replace('/partner/invite/', '').split('/')[0].trim();
    }
    return searchParams.get('partner_invite') || '';
  }, [pathname]);

  // Determine requested partner/brand slug
  const resolvedInitialSlug = useMemo(() => {
    if (initialSlug) return initialSlug;
    if (pathname.startsWith('/partner/')) {
      const rest = pathname.replace('/partner/', '').split('/')[0].trim();
      if (rest && rest !== 'invite' && rest !== 'login') {
        return rest;
      }
    }
    const singleSeg = pathname.split('/').filter(Boolean);
    if (singleSeg.length === 1 && singleSeg[0] !== 'partner') {
      return singleSeg[0];
    }
    return '';
  }, [initialSlug, pathname]);

  const [loading, setLoading] = useState(true);
  const [ecosystem, setEcosystem] = useState<{
    partners: PartnerProfile[];
    masterProducts: MasterBrandProduct[];
  }>({ partners: [], masterProducts: [] });

  const [activePartner, setActivePartner] = useState<PartnerProfile | null>(null);
  const [partnerProducts, setPartnerProducts] = useState<MasterBrandProduct[]>([]);
  const [calculatorBrandProducts, setCalculatorBrandProducts] = useState<any[]>([]);

  // View mode: 'public_showcase' | 'cabinet_manage' | 'portal_login' | 'accept_invite'
  const [viewMode, setViewMode] = useState<'public_showcase' | 'cabinet_manage' | 'portal_login' | 'accept_invite'>(
    inviteTokenFromPath ? 'accept_invite' : resolvedInitialSlug ? 'public_showcase' : 'portal_login'
  );
  const [activeCabinetTab, setActiveCabinetTab] = useState<'catalog' | 'dealers' | 'employees' | 'settings'>('catalog');

  // Local partner session user (either from currentUser or localStorage)
  const [sessionUser, setSessionUser] = useState<any>(() => {
    if (currentUser) return currentUser;
    try {
      const saved = localStorage.getItem('user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Invite acceptance state
  const [inviteInfo, setInviteInfo] = useState<any>(null);
  const [inviteError, setInviteError] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [invitePassword, setInvitePassword] = useState('');
  const [invitePasswordConfirm, setInvitePasswordConfirm] = useState('');
  const [inviteSubmitting, setInviteSubmitting] = useState(false);

  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Public Showcase filters
  const [showcaseSearch, setShowcaseSearch] = useState('');
  const [showcaseCategory, setShowcaseCategory] = useState<string>('all');
  const [showcaseOnlyNovelties, setShowcaseOnlyNovelties] = useState(false);
  const [showcaseCityFilter, setShowcaseCityFilter] = useState<string>('all');

  // Product Editor modal state
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<MasterBrandProduct> | null>(null);
  const [productSaving, setProductSaving] = useState(false);

  // Category input
  const [newCategoryName, setNewCategoryName] = useState('');

  // Dealer Editor state
  const [newDealer, setNewDealer] = useState<Partial<PartnerDealerEntry>>({
    city: '',
    companyName: '',
    address: '',
    phone: '',
    website: '',
  });
  const [editingDealerId, setEditingDealerId] = useState<string | null>(null);

  // Employee Invite state
  const [empEmail, setEmpEmail] = useState('');
  const [empName, setEmpName] = useState('');
  const [empRole, setEmpRole] = useState('Контент-менеджер бренда');
  const [empInviting, setEmpInviting] = useState(false);
  const [lastGeneratedInviteUrl, setLastGeneratedInviteUrl] = useState('');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Settings / Slug state
  const [editPartnerSlug, setEditPartnerSlug] = useState('');
  const [editBrandSlugsText, setEditBrandSlugsText] = useState('');
  const [editCompanyName, setEditCompanyName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editWebsite, setEditWebsite] = useState('');
  const [slugCheckStatus, setSlugCheckStatus] = useState<{
    checking: boolean;
    available?: boolean;
    message?: string;
  }>({ checking: false });
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Load ecosystem & resolve slug or invite
  const loadData = async (slugToResolve?: string) => {
    setLoading(true);
    try {
      const ecoRes = await fetch('/api/partner/ecosystem');
      const ecoData = await ecoRes.json();
      setEcosystem({
        partners: Array.isArray(ecoData.partners) ? ecoData.partners : [],
        masterProducts: Array.isArray(ecoData.masterProducts) ? ecoData.masterProducts : [],
      });

      if (inviteTokenFromPath) {
        const invRes = await fetch(`/api/partner/invite/${encodeURIComponent(inviteTokenFromPath)}`);
        const invData = await invRes.json();
        if (!invRes.ok) {
          setInviteError(invData.error || 'Приглашение не найдено или устарело');
        } else {
          setInviteInfo(invData);
          setInviteName(invData.invite?.contactName || '');
        }
        setViewMode('accept_invite');
        setLoading(false);
        return;
      }

      const targetSlug = slugToResolve !== undefined ? slugToResolve : resolvedInitialSlug;
      if (targetSlug) {
        const res = await fetch(`/api/partner/resolve/${encodeURIComponent(targetSlug)}`);
        if (res.ok) {
          const data = await res.json();
          setActivePartner(data.partner);
          setPartnerProducts(Array.isArray(data.products) ? data.products : []);
          setCalculatorBrandProducts(Array.isArray(data.calculatorBrandProducts) ? data.calculatorBrandProducts : []);
          syncSettingsForm(data.partner);
          setViewMode('public_showcase');
        } else {
          setViewMode('portal_login');
        }
      } else {
        // Check if sessionUser belongs to a partner
        if (sessionUser?.partnerId) {
          const found = (ecoData.partners || []).find((p: PartnerProfile) => p.id === sessionUser.partnerId);
          if (found) {
            const res = await fetch(`/api/partner/resolve/${encodeURIComponent(found.partnerSlug)}`);
            if (res.ok) {
              const data = await res.json();
              setActivePartner(data.partner);
              setPartnerProducts(Array.isArray(data.products) ? data.products : []);
              setCalculatorBrandProducts(Array.isArray(data.calculatorBrandProducts) ? data.calculatorBrandProducts : []);
              syncSettingsForm(data.partner);
              setViewMode('cabinet_manage');
            }
          }
        }
      }
    } catch (e) {
      console.error('Failed to load partner data:', e);
    } finally {
      setLoading(false);
    }
  };

  const syncSettingsForm = (partner: PartnerProfile) => {
    setEditPartnerSlug(partner.partnerSlug || '');
    setEditBrandSlugsText(extractBrandSlugs(partner.brandSlugs).join(', '));
    setEditCompanyName(partner.companyName || '');
    setEditDescription(partner.description || '');
    setEditCity(partner.city || '');
    setEditPhone(partner.phone || '');
    setEditEmail(partner.email || '');
    setEditWebsite(partner.website || '');
  };

  useEffect(() => {
    loadData();
  }, [resolvedInitialSlug, inviteTokenFromPath]);

  // Can current user manage this partner cabinet?
  const canManageActivePartner = useMemo(() => {
    if (!activePartner) return false;
    if (!sessionUser) return false;
    if (sessionUser.role === 'superadmin' || sessionUser.email === 'admin@mebel.ru') return true;
    if (sessionUser.partnerId === activePartner.id) return true;
    if (
      activePartner.ownerEmail &&
      sessionUser.email &&
      activePartner.ownerEmail.toLowerCase() === sessionUser.email.toLowerCase()
    ) {
      return true;
    }
    if (
      (activePartner.employees || []).some(
        (e) => e.email.toLowerCase() === (sessionUser.email || '').toLowerCase()
      )
    ) {
      return true;
    }
    return false;
  }, [activePartner, sessionUser]);

  // Handle Invite Acceptance
  const handleAcceptInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitePassword || invitePassword.length < 4) {
      setInviteError('Пароль должен содержать минимум 4 символа');
      return;
    }
    if (invitePassword !== invitePasswordConfirm) {
      setInviteError('Пароли не совпадают');
      return;
    }
    setInviteSubmitting(true);
    setInviteError('');
    try {
      const res = await fetch('/api/partner/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: inviteTokenFromPath,
          name: inviteName.trim(),
          password: invitePassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Ошибка активации приглашения');
      }
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
        setSessionUser(data.user);
      }
      if (data.partner) {
        setActivePartner(data.partner);
        syncSettingsForm(data.partner);
        window.history.replaceState({}, '', `/partner/${data.partner.partnerSlug}`);
        await loadData(data.partner.partnerSlug);
        setViewMode('cabinet_manage');
        showToast('Добро пожаловать в кабинет партнера!');
      }
    } catch (err: any) {
      setInviteError(err.message || 'Ошибка при создании аккаунта');
    } finally {
      setInviteSubmitting(false);
    }
  };

  // Handle Partner Login
  const handlePartnerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginEmail.trim(),
          password: loginPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Неверный E-mail или пароль');
      }
      const loggedUser = data.user || data;
      localStorage.setItem('user', JSON.stringify(loggedUser));
      setSessionUser(loggedUser);

      // Find partner associated with this user
      const matchingPartner = ecosystem.partners.find(
        (p) =>
          p.id === loggedUser.partnerId ||
          (p.ownerEmail && p.ownerEmail.toLowerCase() === loggedUser.email?.toLowerCase()) ||
          (p.employees || []).some((emp) => emp.email.toLowerCase() === loggedUser.email?.toLowerCase())
      );

      if (matchingPartner) {
        window.history.pushState({}, '', `/partner/${matchingPartner.partnerSlug}`);
        await loadData(matchingPartner.partnerSlug);
        setViewMode('cabinet_manage');
      } else if (loggedUser.role === 'superadmin' || loggedUser.email === 'admin@mebel.ru') {
        if (activePartner) {
          setViewMode('cabinet_manage');
        } else if (ecosystem.partners.length > 0) {
          const first = ecosystem.partners[0];
          window.history.pushState({}, '', `/partner/${first.partnerSlug}`);
          await loadData(first.partnerSlug);
          setViewMode('cabinet_manage');
        }
      } else {
        setLoginError('У этого аккаунта нет привязанного кабинета поставщика или бренда. Доступ выдается по приглашению администратора.');
      }
    } catch (err: any) {
      setLoginError(err.message || 'Ошибка входа');
    } finally {
      setLoginLoading(false);
    }
  };

  // Save partner profile helper
  const savePartnerProfileUpdates = async (updates: Partial<PartnerProfile>, successMsg = 'Изменения сохранены') => {
    if (!activePartner) return false;
    try {
      const res = await fetch('/api/partner/save-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partnerId: activePartner.id,
          ...updates,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Ошибка сохранения');
      }
      setActivePartner(data.partner);
      syncSettingsForm(data.partner);
      showToast(successMsg);
      return true;
    } catch (err: any) {
      showToast(err.message || 'Ошибка сохранения');
      return false;
    }
  };

  // Save or update Master Brand Product
  const handleSaveMasterProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePartner || !editingProduct) return;
    if (!editingProduct.manufacturerArticle?.trim() || !editingProduct.name?.trim()) {
      showToast('Заполните артикул производителя и название товара');
      return;
    }
    setProductSaving(true);
    try {
      const res = await fetch('/api/partner/master-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingProduct.id,
          partnerId: activePartner.id,
          brand: editingProduct.brand || activePartner.managedBrands[0] || activePartner.companyName,
          manufacturerArticle: editingProduct.manufacturerArticle.trim(),
          name: editingProduct.name.trim(),
          category: editingProduct.category || (activePartner.categories[0] || 'Фурнитура'),
          unit: editingProduct.unit || 'шт',
          price: Number(editingProduct.price) || 0,
          image: editingProduct.image || '',
          description: editingProduct.description || '',
          isNovelty: Boolean(editingProduct.isNovelty),
          specs: editingProduct.specs || {},
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка сохранения товара');

      const saved = data.product as MasterBrandProduct;
      setPartnerProducts((prev) => {
        const exists = prev.some((p) => p.id === saved.id);
        return exists ? prev.map((p) => (p.id === saved.id ? saved : p)) : [saved, ...prev];
      });
      setShowProductModal(false);
      setEditingProduct(null);
      showToast('Эталонная карточка товара сохранена в каталоге бренда!');
    } catch (err: any) {
      showToast(err.message || 'Ошибка сохранения');
    } finally {
      setProductSaving(false);
    }
  };

  const handleDeleteMasterProduct = async (id: string) => {
    try {
      const res = await fetch(`/api/partner/master-products/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setPartnerProducts((prev) => prev.filter((p) => p.id !== id));
        showToast('Товар удален из эталонного каталога');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Add or update Dealer
  const handleSaveDealer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePartner) return;
    if (!newDealer.city?.trim() || !newDealer.companyName?.trim()) {
      showToast('Укажите город и название компании-дилера');
      return;
    }
    const dealerEntry: PartnerDealerEntry = {
      id: editingDealerId || `dlr-${Date.now()}`,
      city: newDealer.city.trim(),
      companyName: newDealer.companyName.trim(),
      address: (newDealer.address || '').trim(),
      phone: (newDealer.phone || '').trim(),
      website: (newDealer.website || '').trim(),
      brands: activePartner.managedBrands,
      isVerified: true,
    };
    const updatedDealers = editingDealerId
      ? (activePartner.dealers || []).map((d) => (d.id === editingDealerId ? dealerEntry : d))
      : [...(activePartner.dealers || []), dealerEntry];

    const ok = await savePartnerProfileUpdates(
      { dealers: updatedDealers },
      editingDealerId ? 'Данные дилера обновлены' : 'Официальный дилер добавлен'
    );
    if (ok) {
      setNewDealer({ city: '', companyName: '', address: '', phone: '', website: '' });
      setEditingDealerId(null);
    }
  };

  const handleRemoveDealer = async (dealerId: string) => {
    if (!activePartner) return;
    const updatedDealers = (activePartner.dealers || []).filter((d) => d.id !== dealerId);
    await savePartnerProfileUpdates({ dealers: updatedDealers }, 'Дилер удален');
  };

  // Invite Employee
  const handleInviteEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePartner || !empEmail.trim()) return;
    setEmpInviting(true);
    try {
      const res = await fetch('/api/partner/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: empEmail.trim(),
          contactName: empName.trim() || empEmail.split('@')[0],
          companyName: activePartner.companyName,
          role: activePartner.role,
          managedBrands: activePartner.managedBrands,
          partnerId: activePartner.id,
          isEmployeeInvite: true,
          employeeRole: empRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка отправки приглашения');
      const fullUrl = `${window.location.origin}${data.inviteUrl}`;
      setLastGeneratedInviteUrl(fullUrl);
      setEmpEmail('');
      setEmpName('');
      await loadData(activePartner.partnerSlug);
      showToast('Приглашение для сотрудника сформировано!');
    } catch (err: any) {
      showToast(err.message || 'Ошибка приглашения сотрудника');
    } finally {
      setEmpInviting(false);
    }
  };

  // Check slug availability
  const checkSlugAvailability = async (slugValue: string, type: 'partner' | 'brand' = 'partner') => {
    if (!activePartner || !slugValue.trim()) return;
    setSlugCheckStatus({ checking: true });
    try {
      const res = await fetch('/api/partner/check-slug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: slugValue.trim(),
          partnerId: activePartner.id,
          type,
        }),
      });
      const data = await res.json();
      setSlugCheckStatus({
        checking: false,
        available: data.available,
        message: data.available
          ? `Адрес свободен: mebel-plan.ru/${type === 'brand' ? '' : 'partner/'}${data.normalized}`
          : data.reason || 'Этот адрес уже занят',
      });
    } catch {
      setSlugCheckStatus({ checking: false });
    }
  };

  // Filtered products & dealers for showcase
  const filteredShowcaseProducts = useMemo(() => {
    return partnerProducts.filter((p) => {
      if (showcaseOnlyNovelties && !p.isNovelty) return false;
      if (showcaseCategory !== 'all' && p.category !== showcaseCategory) return false;
      if (showcaseSearch.trim()) {
        const q = showcaseSearch.toLowerCase();
        const matchArt = (p.manufacturerArticle || '').toLowerCase().includes(q);
        const matchName = (p.name || '').toLowerCase().includes(q);
        const matchBrand = (p.brand || '').toLowerCase().includes(q);
        if (!matchArt && !matchName && !matchBrand) return false;
      }
      return true;
    });
  }, [partnerProducts, showcaseOnlyNovelties, showcaseCategory, showcaseSearch]);

  const availableDealerCities = useMemo(() => {
    if (!activePartner) return [];
    const set = new Set<string>();
    (activePartner.dealers || []).forEach((d) => {
      if (d.city) set.add(d.city);
    });
    return Array.from(set);
  }, [activePartner]);

  const filteredDealers = useMemo(() => {
    if (!activePartner) return [];
    return (activePartner.dealers || []).filter((d) => {
      if (showcaseCityFilter !== 'all' && d.city.toLowerCase() !== showcaseCityFilter.toLowerCase()) {
        return false;
      }
      return true;
    });
  }, [activePartner, showcaseCityFilter]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-sm font-bold text-slate-600">Загрузка экосистемы брендов и партнеров...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-slate-900 text-white text-xs font-bold shadow-xl border border-slate-700">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <a
              href="/"
              onClick={(e) => {
                if (onExitToMain) {
                  e.preventDefault();
                  onExitToMain();
                }
              }}
              className="flex items-center gap-2.5 group"
            >
              <AppIcon className="w-9 h-9 rounded-xl shadow-xs" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-black tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors">
                    Мебель План
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 text-[10px] font-extrabold uppercase tracking-wider">
                    Бренды и Поставщики
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 hidden sm:block">
                  Официальные каталоги производителей, новинки и дилерская сеть
                </p>
              </div>
            </a>
          </div>

          <div className="flex items-center gap-2.5">
            {activePartner && (
              <div className="hidden md:flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setViewMode('public_showcase')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    viewMode === 'public_showcase'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Публичная витрина бренда
                </button>
                {canManageActivePartner ? (
                  <button
                    type="button"
                    onClick={() => setViewMode('cabinet_manage')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      viewMode === 'cabinet_manage'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-700 hover:text-blue-600'
                    }`}
                  >
                    Управление кабинетом
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setViewMode('portal_login')}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
                  >
                    Вход для представителя
                  </button>
                )}
              </div>
            )}

            <a
              href="/"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-xs font-bold text-slate-700 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              На главную
            </a>
          </div>
        </div>
      </header>

      {/* MODE 1: ACCEPT INVITE (/partner/invite/:token) */}
      {viewMode === 'accept_invite' && (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="p-6 bg-gradient-to-r from-slate-900 to-indigo-950 text-white">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-400/20 text-amber-300 text-[11px] font-bold mb-2">
                <KeyRound className="w-3.5 h-3.5" />
                Персональное приглашение
              </div>
              <h2 className="text-xl font-black">Регистрация кабинета партнера</h2>
              <p className="text-xs text-slate-300 mt-1">
                Задайте пароль для входа в закрытый кабинет бренда / поставщика в «Мебель План»
              </p>
            </div>

            {inviteError && !inviteInfo ? (
              <div className="p-6 space-y-4 text-center">
                <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-slate-800">{inviteError}</p>
                <button
                  type="button"
                  onClick={() => {
                    window.history.pushState({}, '', '/partner');
                    setViewMode('portal_login');
                  }}
                  className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold cursor-pointer"
                >
                  Перейти ко входу в кабинет
                </button>
              </div>
            ) : (
              <form onSubmit={handleAcceptInvite} className="p-6 space-y-4">
                {inviteError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-xs font-bold text-red-600">
                    {inviteError}
                  </div>
                )}

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="text-[11px] text-slate-400 font-bold uppercase">Компания / Представительство</div>
                  <div className="text-sm font-black text-slate-900">
                    {inviteInfo?.partner?.companyName || inviteInfo?.invite?.companyName}
                  </div>
                  <div className="text-xs text-slate-600">
                    E-mail: <span className="font-bold text-slate-900">{inviteInfo?.invite?.email}</span>
                  </div>
                  {inviteInfo?.partner?.managedBrands?.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {inviteInfo.partner.managedBrands.map((b: string) => (
                        <span
                          key={b}
                          className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[10px] font-extrabold"
                        >
                          {b}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Ваше имя и должность</label>
                  <input
                    type="text"
                    required
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    placeholder="Иван Петров"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Задайте пароль для входа</label>
                  <input
                    type="password"
                    required
                    value={invitePassword}
                    onChange={(e) => setInvitePassword(e.target.value)}
                    placeholder="Минимум 4 символа"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Повторите пароль</label>
                  <input
                    type="password"
                    required
                    value={invitePasswordConfirm}
                    onChange={(e) => setInvitePasswordConfirm(e.target.value)}
                    placeholder="Повторите пароль"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                  />
                </div>

                <button
                  type="submit"
                  disabled={inviteSubmitting}
                  className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-lg shadow-blue-200 transition-all cursor-pointer"
                >
                  {inviteSubmitting ? 'Активация кабинета...' : 'Завершить регистрацию и войти в кабинет'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODE 2: PORTAL LOGIN & DIRECTORY (/partner) */}
      {viewMode === 'portal_login' && (
        <div className="max-w-6xl mx-auto w-full px-4 py-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: Login Card */}
          <div className="lg:col-span-5">
            <div className="bg-white rounded-3xl shadow-lg border border-slate-200 overflow-hidden">
              <div className="p-6 bg-slate-900 text-white">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-400/20 text-amber-300 text-[11px] font-bold mb-2">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Закрытый контур партнеров
                </div>
                <h2 className="text-xl font-black">Вход в кабинет бренда / поставщика</h2>
                <p className="text-xs text-slate-300 mt-1">
                  Используйте корпоративный E-mail, на который было получено приглашение от администрации «Мебель План»
                </p>
              </div>

              <form onSubmit={handlePartnerLogin} className="p-6 space-y-4">
                {loginError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-xs font-semibold text-red-600">
                    {loginError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Корпоративный E-mail</label>
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="partner@brand.ru"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Пароль</label>
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-lg shadow-blue-200 transition-all cursor-pointer"
                >
                  {loginLoading ? 'Вход...' : 'Войти в кабинет партнера'}
                </button>
              </form>
            </div>
          </div>

          {/* Right: Official Brand Showcases Directory */}
          <div className="lg:col-span-7 space-y-5">
            <div>
              <h3 className="text-lg font-black text-slate-900">
                Официальные представительства и бренды в «Мебель План»
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Прямые брендовые витрины (<span className="font-mono font-bold text-slate-700">mebel-plan.ru/бренд</span>) и мультибрендовые кабинеты официальных партнеров (<span className="font-mono font-bold text-slate-700">mebel-plan.ru/partner/...</span>)
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {ecosystem.partners.map((partner) => {
                const partnerSlugs = extractBrandSlugs(partner.brandSlugs);
                const directBrand = partnerSlugs[0];
                const prodCount = ecosystem.masterProducts.filter((m) => m.partnerId === partner.id).length;
                return (
                  <div
                    key={partner.id}
                    className="p-5 rounded-3xl bg-white border border-slate-200 hover:border-blue-300 shadow-xs transition-all flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-extrabold">
                            {partner.role === 'brand_representative' ? 'Представительство бренда' : 'Официальный дилер'}
                          </span>
                          <h4 className="text-base font-black text-slate-900 mt-1">{partner.companyName}</h4>
                        </div>
                      </div>

                      <p className="text-xs text-slate-500 line-clamp-2">{partner.description}</p>

                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {(partner.managedBrands || []).map((b) => (
                          <span
                            key={b}
                            className="px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-800 text-[11px] font-bold"
                          >
                            {b}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>Эталонных товаров: <strong className="text-slate-800">{prodCount}</strong></span>
                        <span>Дилеров в РФ: <strong className="text-slate-800">{(partner.dealers || []).length}</strong></span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {directBrand && (
                          <button
                            type="button"
                            onClick={() => {
                              window.history.pushState({}, '', `/${directBrand}`);
                              loadData(directBrand);
                            }}
                            className="flex-1 px-3 py-2 rounded-xl bg-slate-900 hover:bg-blue-600 text-white text-[11px] font-bold transition-colors cursor-pointer text-center"
                          >
                            mebel-plan.ru/{directBrand}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            window.history.pushState({}, '', `/partner/${partner.partnerSlug}`);
                            loadData(partner.partnerSlug);
                          }}
                          className="flex-1 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition-colors cursor-pointer text-center"
                        >
                          /partner/{partner.partnerSlug}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MODE 3: PUBLIC BRAND / PARTNER SHOWCASE */}
      {viewMode === 'public_showcase' && activePartner && (
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 space-y-8">
          {/* Brand Hero Banner */}
          <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white p-6 sm:p-8 shadow-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-3 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-400/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Верифицированный партнер «Мебель План»
                </span>
                {extractBrandSlugs(activePartner.brandSlugs).map((bs) => (
                  <span
                    key={bs}
                    className="px-2.5 py-1 rounded-full bg-white/10 text-white text-xs font-mono font-bold"
                  >
                    mebel-plan.ru/{bs}
                  </span>
                ))}
                <span className="px-2.5 py-1 rounded-full bg-white/10 text-slate-300 text-xs font-mono">
                  mebel-plan.ru/partner/{activePartner.partnerSlug}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{activePartner.companyName}</h1>
              {activePartner.description && (
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">{activePartner.description}</p>
              )}

              <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-slate-300">
                {activePartner.city && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-amber-400" />
                    {activePartner.city}
                  </span>
                )}
                {activePartner.phone && (
                  <span className="inline-flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-amber-400" />
                    {activePartner.phone}
                  </span>
                )}
                {activePartner.website && (
                  <a
                    href={activePartner.website}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-amber-300 hover:underline font-bold"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    Официальный сайт
                  </a>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0 w-full sm:w-auto">
              {canManageActivePartner ? (
                <button
                  type="button"
                  onClick={() => setViewMode('cabinet_manage')}
                  className="px-5 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Settings className="w-4 h-4" />
                  Перейти к управлению кабинетом
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setViewMode('portal_login')}
                  className="px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  Вход для сотрудников бренда
                </button>
              )}
            </div>
          </div>

          {/* Showcase Content: Catalog + Regional Dealers */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Master Catalog Column */}
            <div className="lg:col-span-8 space-y-4">
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-black text-slate-900">
                      Эталонный каталог и новинки ({filteredShowcaseProducts.length})
                    </h2>
                    <p className="text-xs text-slate-500">
                      Введите <strong>Артикул производителя</strong> у себя в разделе «Товары и категории» Мебель План — карточка заполнится автоматически
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowcaseOnlyNovelties(!showcaseOnlyNovelties)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                      showcaseOnlyNovelties
                        ? 'bg-amber-400 text-slate-950 shadow-xs'
                        : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Только новинки
                  </button>
                </div>

                {/* Search & Categories */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={showcaseSearch}
                      onChange={(e) => setShowcaseSearch(e.target.value)}
                      placeholder="Поиск по артикулу производителя (напр. H309A02/0910) или названию..."
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium"
                    />
                  </div>
                  <select
                    value={showcaseCategory}
                    onChange={(e) => setShowcaseCategory(e.target.value)}
                    className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white"
                  >
                    <option value="all">Все категории ({partnerProducts.length})</option>
                    {(activePartner.categories || []).map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Product Cards */}
                {filteredShowcaseProducts.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400">
                    По выбранным фильтрам товары не найдены
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    {filteredShowcaseProducts.map((prod) => (
                      <div
                        key={prod.id}
                        className="p-4 rounded-2xl border border-slate-200 hover:border-blue-300 bg-white flex flex-col justify-between gap-3 transition-all"
                      >
                        <div className="space-y-2.5">
                          <div className="flex items-start gap-3">
                            {prod.image ? (
                              <img
                                src={prod.image}
                                alt={prod.name}
                                className="w-16 h-16 rounded-xl object-cover border border-slate-100 shrink-0 bg-slate-50"
                              />
                            ) : (
                              <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                                <Package className="w-6 h-6" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-1.5 mb-1">
                                <span className="px-2 py-0.5 rounded-md bg-slate-900 text-white font-mono text-[10px] font-bold">
                                  Арт: {prod.manufacturerArticle}
                                </span>
                                {prod.isNovelty && (
                                  <span className="px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 text-[10px] font-black">
                                    🔥 НОВИНКА
                                  </span>
                                )}
                              </div>
                              <h4 className="text-xs font-extrabold text-slate-900 leading-snug">{prod.name}</h4>
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                {prod.brand} • {prod.category}
                              </div>
                            </div>
                          </div>

                          {prod.description && (
                            <p className="text-[11px] text-slate-600 leading-relaxed line-clamp-3">
                              {prod.description}
                            </p>
                          )}
                        </div>

                        <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase font-bold block">РРЦ / Базовая цена</span>
                            <span className="text-sm font-black text-slate-900">
                              {Number(prod.price || 0).toLocaleString('ru-RU')} ₽{' '}
                              <span className="text-[11px] font-normal text-slate-500">/ {prod.unit || 'шт'}</span>
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(prod.manufacturerArticle);
                              showToast(`Артикул ${prod.manufacturerArticle} скопирован!`);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            Копировать артикул
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Official Regional Dealers Column */}
            <div className="lg:col-span-4 space-y-4">
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-blue-600" />
                      Где купить — Официальные дилеры
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Отображаются мебельщикам вашего региона прямо в карточках товаров
                    </p>
                  </div>
                </div>

                {/* City Filter */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Фильтр по городу</label>
                  <select
                    value={showcaseCityFilter}
                    onChange={(e) => setShowcaseCityFilter(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-slate-50"
                  >
                    <option value="all">Все города ({(activePartner.dealers || []).length})</option>
                    {availableDealerCities.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Dealers List */}
                <div className="space-y-3">
                  {filteredDealers.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl">
                      Дилеры в выбранном городе пока не указаны
                    </div>
                  ) : (
                    filteredDealers.map((dlr) => (
                      <div
                        key={dlr.id}
                        className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[10px] font-extrabold">
                            г. {dlr.city}
                          </span>
                          {dlr.isVerified && (
                            <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Официальный дилер
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-extrabold text-slate-900">{dlr.companyName}</div>
                        {dlr.address && <div className="text-[11px] text-slate-600">{dlr.address}</div>}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px]">
                          {dlr.phone && (
                            <a href={`tel:${dlr.phone}`} className="font-bold text-slate-800 hover:text-blue-600">
                              {dlr.phone}
                            </a>
                          )}
                          {dlr.website && (
                            <a
                              href={dlr.website}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 hover:underline font-bold flex items-center gap-1"
                            >
                              Сайт <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODE 4: PARTNER MANAGEMENT CABINET */}
      {viewMode === 'cabinet_manage' && activePartner && (
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6">
          {/* Cabinet Header */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-md bg-blue-600 text-white text-[10px] font-black uppercase">
                  Кабинет партнера
                </span>
                {activePartner.managedBrands.map((b) => (
                  <span key={b} className="px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-900 text-xs font-extrabold">
                    Бренд: {b}
                  </span>
                ))}
              </div>
              <h1 className="text-xl font-black text-slate-900">{activePartner.companyName}</h1>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                <span>
                  Адрес партнера:{' '}
                  <strong className="font-mono text-slate-800">mebel-plan.ru/partner/{activePartner.partnerSlug}</strong>
                </span>
                {extractBrandSlugs(activePartner.brandSlugs).length > 0 && (
                  <span>
                    Прямой бренд-адрес:{' '}
                    <strong className="font-mono text-blue-600">
                      mebel-plan.ru/{extractBrandSlugs(activePartner.brandSlugs)[0]}
                    </strong>
                  </span>
                )}
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl">
              <button
                type="button"
                onClick={() => setActiveCabinetTab('catalog')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeCabinetTab === 'catalog'
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                Каталог и Новинки ({partnerProducts.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveCabinetTab('dealers')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeCabinetTab === 'dealers'
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                Дилеры по городам ({(activePartner.dealers || []).length})
              </button>
              <button
                type="button"
                onClick={() => setActiveCabinetTab('employees')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeCabinetTab === 'employees'
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                Сотрудники ({(activePartner.employees || []).length})
              </button>
              <button
                type="button"
                onClick={() => setActiveCabinetTab('settings')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeCabinetTab === 'settings'
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Link2 className="w-3.5 h-3.5" />
                Адреса и Настройки
              </button>
            </div>
          </div>

          {/* TAB 1: CATALOG & NOVELTIES */}
          {activeCabinetTab === 'catalog' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-black text-slate-900">
                      Эталонные карточки товаров бренда (по Артикулу производителя)
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Каждый товар, добавленный здесь, автоматически предлагается всем мебельщикам при вводе артикула в разделе «Товары и категории»
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingProduct({
                        brand: activePartner.managedBrands[0] || activePartner.companyName,
                        manufacturerArticle: '',
                        name: '',
                        category: activePartner.categories[0] || 'Фурнитура',
                        unit: 'шт',
                        price: 0,
                        image: '',
                        description: '',
                        isNovelty: true,
                      });
                      setShowProductModal(true);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black flex items-center gap-2 shadow-md shadow-blue-100 cursor-pointer shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    Добавить товар / Новинку
                  </button>
                </div>

                {/* Categories bar */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-500 mr-2">Категории бренда:</span>
                    {(activePartner.categories || []).map((cat) => (
                      <span
                        key={cat}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-800"
                      >
                        {cat}
                        <button
                          type="button"
                          onClick={() => {
                            const next = activePartner.categories.filter((c) => c !== cat);
                            savePartnerProfileUpdates({ categories: next }, 'Категория удалена');
                          }}
                          className="text-slate-400 hover:text-red-600 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Новая категория..."
                      className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!newCategoryName.trim()) return;
                        const next = Array.from(new Set([...(activePartner.categories || []), newCategoryName.trim()]));
                        savePartnerProfileUpdates({ categories: next }, 'Категория добавлена');
                        setNewCategoryName('');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold cursor-pointer"
                    >
                      + Категория
                    </button>
                  </div>
                </div>

                {/* Master Products Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-[11px] font-extrabold text-slate-400 uppercase">
                        <th className="py-3 px-3">Фото</th>
                        <th className="py-3 px-3">Арт. производителя</th>
                        <th className="py-3 px-3">Наименование и описание</th>
                        <th className="py-3 px-3">Бренд / Категория</th>
                        <th className="py-3 px-3">РРЦ</th>
                        <th className="py-3 px-3">Статус</th>
                        <th className="py-3 px-3 text-right">Действия</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {partnerProducts.map((prod) => (
                        <tr key={prod.id} className="hover:bg-slate-50/80">
                          <td className="py-3 px-3">
                            {prod.image ? (
                              <img
                                src={prod.image}
                                alt={prod.name}
                                className="w-11 h-11 rounded-xl object-cover border border-slate-200"
                              />
                            ) : (
                              <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                                <Package className="w-5 h-5" />
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-slate-900">
                            {prod.manufacturerArticle}
                          </td>
                          <td className="py-3 px-3 max-w-md">
                            <div className="font-extrabold text-slate-900">{prod.name}</div>
                            {prod.description && (
                              <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{prod.description}</div>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-bold text-slate-800">{prod.brand}</span>
                            <div className="text-[11px] text-slate-500">{prod.category}</div>
                          </td>
                          <td className="py-3 px-3 font-extrabold text-slate-900">
                            {Number(prod.price || 0).toLocaleString('ru-RU')} ₽ / {prod.unit || 'шт'}
                          </td>
                          <td className="py-3 px-3">
                            {prod.isNovelty ? (
                              <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 text-[10px] font-black">
                                🔥 Новинка
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-bold">
                                Базовый каталог
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingProduct(prod);
                                  setShowProductModal(true);
                                }}
                                className="p-2 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 cursor-pointer"
                                title="Редактировать"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteMasterProduct(prod.id)}
                                className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                                title="Удалить"
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

              {/* Existing Products in Calculator from this Brand */}
              {calculatorBrandProducts.length > 0 && (
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                  <div>
                    <h3 className="text-base font-black text-slate-900">
                      Товары вашего бренда, уже используемые мебельщиками в расчетах ({calculatorBrandProducts.length})
                    </h3>
                    <p className="text-xs text-slate-500">
                      Вы можете в один клик перенести любой из этих товаров в свой эталонный каталог и стандартизировать его описание и фото
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {calculatorBrandProducts.slice(0, 9).map((cp) => (
                      <div
                        key={cp.id}
                        className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="text-[10px] font-mono font-bold text-slate-500">
                            Арт: {cp.manufacturerArticle || cp.article || 'без арт.'}
                          </div>
                          <div className="text-xs font-bold text-slate-900 truncate">{cp.name}</div>
                          <div className="text-[11px] text-slate-500">{Number(cp.price || 0)} ₽</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingProduct({
                              brand: cp.brand || activePartner.managedBrands[0],
                              manufacturerArticle: cp.manufacturerArticle || cp.article || '',
                              name: cp.name,
                              category: activePartner.categories[0] || 'Фурнитура',
                              unit: cp.unit || 'шт',
                              price: Number(cp.price) || 0,
                              image: cp.image || '',
                              description: cp.description || '',
                              isNovelty: false,
                            });
                            setShowProductModal(true);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-blue-500 text-blue-600 text-[11px] font-bold shrink-0 cursor-pointer"
                        >
                          Сделать эталоном
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: REGIONAL DEALERS */}
          {activeCabinetTab === 'dealers' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5">
                <form
                  onSubmit={handleSaveDealer}
                  className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4"
                >
                  <h3 className="text-base font-black text-slate-900">
                    {editingDealerId ? 'Редактировать официального дилера' : 'Добавить официального дилера в городе'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Когда мебельная компания из этого города откроет карточку вашего товара в Калькуляторе, она увидит этого дилера в блоке «Где купить»
                  </p>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Город *</label>
                    <input
                      type="text"
                      required
                      value={newDealer.city || ''}
                      onChange={(e) => setNewDealer({ ...newDealer, city: e.target.value })}
                      placeholder="Например: Екатеринбург"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Название компании-дилера *</label>
                    <input
                      type="text"
                      required
                      value={newDealer.companyName || ''}
                      onChange={(e) => setNewDealer({ ...newDealer, companyName: e.target.value })}
                      placeholder="Например: ТБМ-Урал / Экспо-Торг"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Адрес склада / шоурума</label>
                    <input
                      type="text"
                      value={newDealer.address || ''}
                      onChange={(e) => setNewDealer({ ...newDealer, address: e.target.value })}
                      placeholder="ул. Базовая, д. 10"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Телефон отдела продаж</label>
                      <input
                        type="text"
                        value={newDealer.phone || ''}
                        onChange={(e) => setNewDealer({ ...newDealer, phone: e.target.value })}
                        placeholder="+7 (343) 000-00-00"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Сайт дилера</label>
                      <input
                        type="text"
                        value={newDealer.website || ''}
                        onChange={(e) => setNewDealer({ ...newDealer, website: e.target.value })}
                        placeholder="https://dealer.ru"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    {editingDealerId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingDealerId(null);
                          setNewDealer({ city: '', companyName: '', address: '', phone: '', website: '' });
                        }}
                        className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer"
                      >
                        Отмена
                      </button>
                    )}
                    <button
                      type="submit"
                      className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black cursor-pointer"
                    >
                      {editingDealerId ? 'Сохранить изменения' : '+ Добавить дилера в список'}
                    </button>
                  </div>
                </form>
              </div>

              <div className="lg:col-span-7">
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                  <h3 className="text-base font-black text-slate-900">
                    Официальная дилерская сеть ({(activePartner.dealers || []).length})
                  </h3>
                  <div className="space-y-3">
                    {(activePartner.dealers || []).map((dlr) => (
                      <div
                        key={dlr.id}
                        className="p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-800 text-xs font-extrabold">
                              г. {dlr.city}
                            </span>
                            <span className="text-sm font-black text-slate-900">{dlr.companyName}</span>
                          </div>
                          <div className="text-xs text-slate-600">{dlr.address}</div>
                          <div className="flex items-center gap-4 text-xs text-slate-500">
                            {dlr.phone && <span>Тел: {dlr.phone}</span>}
                            {dlr.website && (
                              <a
                                href={dlr.website}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-600 hover:underline font-bold"
                              >
                                {dlr.website}
                              </a>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingDealerId(dlr.id);
                              setNewDealer(dlr);
                            }}
                            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 cursor-pointer"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveDealer(dlr.id)}
                            className="p-2 rounded-xl border border-slate-200 hover:bg-red-50 text-red-600 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: EMPLOYEES */}
          {activeCabinetTab === 'employees' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5">
                <form
                  onSubmit={handleInviteEmployee}
                  className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4"
                >
                  <h3 className="text-base font-black text-slate-900">Пригласить сотрудника в кабинет</h3>
                  <p className="text-xs text-slate-500">
                    Укажите E-mail сотрудника — система сформирует персональную ссылку-приглашение для создания пароля и доступа к вашему кабинету бренда
                  </p>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">E-mail сотрудника *</label>
                    <input
                      type="email"
                      required
                      value={empEmail}
                      onChange={(e) => setEmpEmail(e.target.value)}
                      placeholder="manager@brand.ru"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Имя и фамилия</label>
                    <input
                      type="text"
                      value={empName}
                      onChange={(e) => setEmpName(e.target.value)}
                      placeholder="Мария Соколова"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Роль в кабинете</label>
                    <select
                      value={empRole}
                      onChange={(e) => setEmpRole(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
                    >
                      <option value="Контент-менеджер бренда">Контент-менеджер каталога и новинок</option>
                      <option value="Руководитель дилерской сети">Руководитель дилерской сети</option>
                      <option value="Администратор представительства">Администратор представительства</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={empInviting}
                    className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black cursor-pointer"
                  >
                    {empInviting ? 'Создание ссылки...' : 'Сформировать приглашение сотруднику'}
                  </button>

                  {lastGeneratedInviteUrl && (
                    <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2">
                      <div className="text-xs font-bold text-emerald-900">
                        Ссылка-приглашение для сотрудника готова:
                      </div>
                      <div className="text-[11px] font-mono bg-white p-2 rounded-lg border border-emerald-200 break-all">
                        {lastGeneratedInviteUrl}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(lastGeneratedInviteUrl);
                          showToast('Ссылка-приглашение скопирована!');
                        }}
                        className="w-full py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold cursor-pointer"
                      >
                        Скопировать ссылку
                      </button>
                    </div>
                  )}
                </form>
              </div>

              <div className="lg:col-span-7">
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                  <h3 className="text-base font-black text-slate-900">
                    Команда кабинета ({(activePartner.employees || []).length})
                  </h3>
                  {(activePartner.employees || []).length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl">
                      Вы еще не добавили дополнительных сотрудников. Владелец кабинета: {activePartner.ownerEmail || activePartner.email}
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {(activePartner.employees || []).map((emp) => (
                        <div
                          key={emp.id}
                          className="p-3.5 rounded-2xl border border-slate-200 flex items-center justify-between gap-3"
                        >
                          <div>
                            <div className="text-xs font-extrabold text-slate-900">{emp.name}</div>
                            <div className="text-[11px] text-slate-500">
                              {emp.email} • {emp.role}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                                emp.status === 'active'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {emp.status === 'active' ? 'Активен' : 'Ожидает входа по ссылке'}
                            </span>
                            {emp.inviteToken && emp.status === 'invited' && (
                              <button
                                type="button"
                                onClick={() => {
                                  const url = `${window.location.origin}/partner/invite/${emp.inviteToken}`;
                                  navigator.clipboard.writeText(url);
                                  setCopiedToken(emp.id);
                                  setTimeout(() => setCopiedToken(null), 2000);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold cursor-pointer"
                              >
                                {copiedToken === emp.id ? 'Скопировано!' : 'Ссылка входа'}
                              </button>
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

          {/* TAB 4: URL SLUGS & SETTINGS */}
          {activeCabinetTab === 'settings' && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs max-w-3xl space-y-5">
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  Персональные адреса в «Мебель План» и реквизиты
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Настройте короткий адрес кабинета представителя/дилера (<span className="font-mono font-bold">mebel-plan.ru/partner/название</span>) и прямые адреса брендов (<span className="font-mono font-bold">mebel-plan.ru/бренд</span>)
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Адрес кабинета партнера (mebel-plan.ru/partner/...)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editPartnerSlug}
                      onChange={(e) => {
                        setEditPartnerSlug(e.target.value);
                        checkSlugAvailability(e.target.value, 'partner');
                      }}
                      placeholder="boyard-russia"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-mono bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Прямые адреса брендов (mebel-plan.ru/...)
                  </label>
                  <input
                    type="text"
                    value={editBrandSlugsText}
                    onChange={(e) => {
                      setEditBrandSlugsText(e.target.value);
                      const first = e.target.value.split(',')[0]?.trim();
                      if (first) checkSlugAvailability(first, 'brand');
                    }}
                    placeholder="boyard"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-mono bg-white"
                  />
                </div>

                {slugCheckStatus.message && (
                  <div
                    className={`md:col-span-2 text-xs font-bold ${
                      slugCheckStatus.available ? 'text-emerald-600' : 'text-red-600'
                    }`}
                  >
                    {slugCheckStatus.message}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Название компании / Бренда</label>
                  <input
                    type="text"
                    value={editCompanyName}
                    onChange={(e) => setEditCompanyName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Основной город / Регион</label>
                  <input
                    type="text"
                    value={editCity}
                    onChange={(e) => setEditCity(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Телефон</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Официальный сайт</label>
                  <input
                    type="text"
                    value={editWebsite}
                    onChange={(e) => setEditWebsite(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Описание представительства / бренда</label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                />
              </div>

              <button
                type="button"
                disabled={settingsSaving}
                onClick={async () => {
                  setSettingsSaving(true);
                  const brandSlugs = editBrandSlugsText
                    .split(',')
                    .map((s) => s.trim().toLowerCase())
                    .filter(Boolean);
                  const ok = await savePartnerProfileUpdates({
                    partnerSlug: editPartnerSlug.trim(),
                    brandSlugs,
                    companyName: editCompanyName.trim(),
                    city: editCity.trim(),
                    phone: editPhone.trim(),
                    email: editEmail.trim(),
                    website: editWebsite.trim(),
                    description: editDescription.trim(),
                  });
                  setSettingsSaving(false);
                  if (ok && editPartnerSlug.trim()) {
                    window.history.replaceState({}, '', `/partner/${editPartnerSlug.trim()}`);
                  }
                }}
                className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-lg shadow-blue-100 cursor-pointer"
              >
                {settingsSaving ? 'Сохранение...' : 'Сохранить адреса и настройки кабинета'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* MODAL: ADD / EDIT MASTER BRAND PRODUCT */}
      {showProductModal && editingProduct && activePartner && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
          onClick={() => setShowProductModal(false)}
        >
          <div
            className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900">
                {editingProduct.id ? 'Редактировать эталонную карточку товара' : 'Новая эталонная карточка товара бренда'}
              </h3>
              <button
                type="button"
                onClick={() => setShowProductModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMasterProduct} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Артикул производителя *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingProduct.manufacturerArticle || ''}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, manufacturerArticle: e.target.value })
                    }
                    placeholder="Напр.: H309A02/0910"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono font-bold"
                  />
                  <span className="text-[10px] text-slate-400">
                    По этому артикулу мебельщики находят карточку в системе
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Бренд *</label>
                  <select
                    value={editingProduct.brand || activePartner.managedBrands[0] || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, brand: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold bg-white"
                  >
                    {activePartner.managedBrands.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Официальное наименование товара *
                </label>
                <input
                  type="text"
                  required
                  value={editingProduct.name || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  placeholder="Петля с доводчиком Neo H309 накладная..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Категория</label>
                  <select
                    value={editingProduct.category || activePartner.categories[0] || 'Фурнитура'}
                    onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold bg-white"
                  >
                    {(activePartner.categories || ['Фурнитура']).map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">РРЦ / Базовая цена (₽)</label>
                  <input
                    type="number"
                    value={editingProduct.price || 0}
                    onChange={(e) => setEditingProduct({ ...editingProduct, price: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Ед. изм.</label>
                  <input
                    type="text"
                    value={editingProduct.unit || 'шт'}
                    onChange={(e) => setEditingProduct({ ...editingProduct, unit: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Ссылка на изображение (URL)</label>
                <input
                  type="text"
                  value={editingProduct.image || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, image: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Описание и технические характеристики
                </label>
                <textarea
                  rows={3}
                  value={editingProduct.description || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  placeholder="Технические параметры, комплектация, преимущества..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <label className="flex items-center gap-2.5 p-3 rounded-2xl bg-amber-50 border border-amber-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(editingProduct.isNovelty)}
                  onChange={(e) => setEditingProduct({ ...editingProduct, isNovelty: e.target.checked })}
                  className="w-4 h-4 rounded text-amber-600"
                />
                <div>
                  <div className="text-xs font-extrabold text-amber-950">🔥 Отметить как «Новинка бренда»</div>
                  <div className="text-[11px] text-amber-800">
                    Товар получит специальный бейдж при поиске и в витрине новинок для мебельщиков
                  </div>
                </div>
              </label>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={productSaving}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black cursor-pointer"
                >
                  {productSaving ? 'Сохранение...' : 'Сохранить карточку'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

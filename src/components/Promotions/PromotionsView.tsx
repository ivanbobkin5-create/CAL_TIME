import React, { useState } from 'react';
import { 
  Percent, Plus, Trash2, Calendar, Tag, Shield, 
  Settings, CheckCircle, Info, ToggleLeft, ToggleRight, 
  ArrowRight, ShieldCheck, ShoppingBag, Gift, Sparkles, Check
} from 'lucide-react';
import { cn } from '../../lib/utils';

export interface Promotion {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  buyerTypes: ("retail" | "wholesale" | "designer")[];
  promoType: "discount" | "cashback" | "gift_product" | "gift_service" | "installment";
  allowOverlap: boolean;
  isActive?: boolean;

  // Discount
  discountPercent?: number;
  discountScopes?: string[]; // "all_project" | "corp" | "facades_plt" | "facades_cust" | "hardware" | "stone" | "delivery" | "assembly" | "services"
  discountNeedMarkup?: boolean;

  // Cashback
  cashbackPercent?: number;
  cashbackScopes?: string[];
  cashbackNeedMarkup?: boolean;
  cashbackPaymentDays?: number;
  cashbackPaymentTiming?: "before" | "after";
  cashbackPaymentTrigger?: "assembly" | "delivery" | "advance" | "full_payment";

  // Gift Product
  giftProductCategory?: string;
  giftProductId?: string;
  giftProductNeedMarkup?: boolean;
  giftProductMarkupAmount?: number;
  giftProductCustomPrice?: number;

  // Gift Service
  giftServiceId?: string;
  giftServiceNeedMarkup?: boolean;
  giftServiceMarkupAmount?: number;
  giftServiceCustomPrice?: number;

  // Installment
  installmentPrograms?: {
    [key: string]: {
      enabled: boolean;
      bankPercent: number;
      maxAmount: number;
    }
  };
  installmentNeedMarkup?: boolean;
}

const SCOPES_TRANSLATIONS: Record<string, string> = {
  all_project: "Весь проект",
  corp: "Корпус",
  facades_plt: "Фасады плитные",
  facades_cust: "Фасады заказные",
  hardware: "Фурнитура",
  stone: "Столешницы камень/компактламинат",
  delivery: "Доставка",
  assembly: "Сборка",
  services: "Услуги",
};

interface PromotionsViewProps {
  promotions: Promotion[];
  savePromotions: (updated: Promotion[]) => Promise<void>;
  userRole: string | null;
  companyType?: string;
  productCategories: any[];
  catalogProducts: any[];
  catalogServices: any[];
  showAlert: (title: string, message: string) => void;
  showConfirm: (title: string, message: string, onConfirm: () => void) => void;
}

export const PromotionsView = ({
  promotions = [],
  savePromotions,
  userRole,
  companyType = "",
  productCategories = [],
  catalogProducts = [],
  catalogServices = [],
  showAlert,
  showConfirm,
}: PromotionsViewProps) => {
  const isAdminOrSupervisor = userRole === 'admin' || userRole === 'supervisor';
  const [isCreating, setIsCreating] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [buyerTypes, setBuyerTypes] = useState<("retail" | "wholesale" | "designer")[]>([]);
  const [promoType, setPromoType] = useState<Promotion['promoType']>("discount");
  const [allowOverlap, setAllowOverlap] = useState(false);

  // Specific Type parameters
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [discountScopes, setDiscountScopes] = useState<string[]>(["all_project"]);
  const [discountNeedMarkup, setDiscountNeedMarkup] = useState(false);

  const [cashbackPercent, setCashbackPercent] = useState<number>(0);
  const [cashbackScopes, setCashbackScopes] = useState<string[]>(["all_project"]);
  const [cashbackNeedMarkup, setCashbackNeedMarkup] = useState(false);
  const [cashbackPaymentDays, setCashbackPaymentDays] = useState<number>(0);
  const [cashbackPaymentTiming, setCashbackPaymentTiming] = useState<"before" | "after">("after");
  const [cashbackPaymentTrigger, setCashbackPaymentTrigger] = useState<Promotion['cashbackPaymentTrigger']>("full_payment");

  const [giftProductCategory, setGiftProductCategory] = useState('');
  const [giftProductId, setGiftProductId] = useState('');
  const [giftProductNeedMarkup, setGiftProductNeedMarkup] = useState(false);
  const [giftProductMarkupAmount, setGiftProductMarkupAmount] = useState<number>(0);
  const [giftProductCustomPrice, setGiftProductCustomPrice] = useState<number>(0);

  const [giftServiceId, setGiftServiceId] = useState('');
  const [giftServiceNeedMarkup, setGiftServiceNeedMarkup] = useState(false);
  const [giftServiceMarkupAmount, setGiftServiceMarkupAmount] = useState<number>(0);
  const [giftServiceCustomPrice, setGiftServiceCustomPrice] = useState<number>(0);

  const [p3, setP3] = useState({ enabled: false, bankPercent: 0, maxAmount: 100000 });
  const [p4, setP4] = useState({ enabled: false, bankPercent: 0, maxAmount: 150000 });
  const [p6, setP6] = useState({ enabled: false, bankPercent: 0, maxAmount: 200000 });
  const [p10, setP10] = useState({ enabled: false, bankPercent: 0, maxAmount: 300000 });
  const [p12, setP12] = useState({ enabled: false, bankPercent: 0, maxAmount: 400000 });
  const [p24, setP24] = useState({ enabled: false, bankPercent: 0, maxAmount: 600000 });
  const [installmentNeedMarkup, setInstallmentNeedMarkup] = useState(false);

  const resetForm = () => {
    setName('');
    setStartDate(new Date().toISOString().split('T')[0]);
    setEndDate('');
    setBuyerTypes(companyType === 'Производство' || companyType === 'Мебельное производство' ? ['retail'] : ['retail']);
    setPromoType('discount');
    setAllowOverlap(false);
    setDiscountPercent(0);
    setDiscountScopes(["all_project"]);
    setDiscountNeedMarkup(false);
    setCashbackPercent(0);
    setCashbackScopes(["all_project"]);
    setCashbackNeedMarkup(false);
    setCashbackPaymentDays(0);
    setCashbackPaymentTiming('after');
    setCashbackPaymentTrigger('full_payment');
    setGiftProductCategory('');
    setGiftProductId('');
    setGiftProductNeedMarkup(false);
    setGiftProductMarkupAmount(0);
    setGiftProductCustomPrice(0);
    setGiftServiceId('');
    setGiftServiceNeedMarkup(false);
    setGiftServiceMarkupAmount(0);
    setGiftServiceCustomPrice(0);
    setP3({ enabled: false, bankPercent: 0, maxAmount: 100000 });
    setP4({ enabled: false, bankPercent: 0, maxAmount: 150000 });
    setP6({ enabled: false, bankPercent: 0, maxAmount: 200000 });
    setP10({ enabled: false, bankPercent: 0, maxAmount: 300000 });
    setP12({ enabled: false, bankPercent: 0, maxAmount: 400000 });
    setP24({ enabled: false, bankPercent: 0, maxAmount: 600000 });
    setInstallmentNeedMarkup(false);
    setEditingPromo(null);
  };

  const handleEdit = (promo: Promotion) => {
    setEditingPromo(promo);
    setName(promo.name);
    setStartDate(promo.startDate);
    setEndDate(promo.endDate);
    setBuyerTypes(promo.buyerTypes);
    setPromoType(promo.promoType);
    setAllowOverlap(promo.allowOverlap);

    if (promo.promoType === "discount") {
      setDiscountPercent(promo.discountPercent || 0);
      setDiscountScopes(promo.discountScopes || ["all_project"]);
      setDiscountNeedMarkup(promo.discountNeedMarkup || false);
    } else if (promo.promoType === "cashback") {
      setCashbackPercent(promo.cashbackPercent || 0);
      setCashbackScopes(promo.cashbackScopes || ["all_project"]);
      setCashbackNeedMarkup(promo.cashbackNeedMarkup || false);
      setCashbackPaymentDays(promo.cashbackPaymentDays || 0);
      setCashbackPaymentTiming(promo.cashbackPaymentTiming || "after");
      setCashbackPaymentTrigger(promo.cashbackPaymentTrigger || "full_payment");
    } else if (promo.promoType === "gift_product") {
      setGiftProductCategory(promo.giftProductCategory || "");
      setGiftProductId(promo.giftProductId || "");
      setGiftProductNeedMarkup(promo.giftProductNeedMarkup || false);
      setGiftProductMarkupAmount(promo.giftProductMarkupAmount || 0);
      setGiftProductCustomPrice(promo.giftProductCustomPrice || 0);
    } else if (promo.promoType === "gift_service") {
      setGiftServiceId(promo.giftServiceId || "");
      setGiftServiceNeedMarkup(promo.giftServiceNeedMarkup || false);
      setGiftServiceMarkupAmount(promo.giftServiceMarkupAmount || 0);
      setGiftServiceCustomPrice(promo.giftServiceCustomPrice || 0);
    } else if (promo.promoType === "installment") {
      const progs = promo.installmentPrograms || {};
      setP3(progs["0-0-3"] || { enabled: false, bankPercent: 0, maxAmount: 100000 });
      setP4(progs["0-0-4"] || { enabled: false, bankPercent: 0, maxAmount: 150000 });
      setP6(progs["0-0-6"] || { enabled: false, bankPercent: 0, maxAmount: 200000 });
      setP10(progs["0-0-10"] || { enabled: false, bankPercent: 0, maxAmount: 300000 });
      setP12(progs["0-0-12"] || { enabled: false, bankPercent: 0, maxAmount: 450000 });
      setP24(progs["0-0-24"] || { enabled: false, bankPercent: 0, maxAmount: 600000 });
      setInstallmentNeedMarkup(promo.installmentNeedMarkup || false);
    }

    setIsCreating(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showAlert("Ошибка", "Введите название акции");
      return;
    }
    if (!startDate || !endDate) {
      showAlert("Ошибка", "Выберите срок действия акции");
      return;
    }
    if (buyerTypes.length === 0) {
      showAlert("Ошибка", "Выберите типы покупателей для акции");
      return;
    }

    const currentPromoId = editingPromo ? editingPromo.id : Math.random().toString(36).substring(2, 9);
    
    // Core payload
    const payload: Promotion = {
      id: currentPromoId,
      name,
      startDate,
      endDate,
      buyerTypes,
      promoType,
      allowOverlap,
      isActive: true,
    };

    if (promoType === "discount") {
      payload.discountPercent = discountPercent;
      payload.discountScopes = discountScopes;
      payload.discountNeedMarkup = discountNeedMarkup;
    } else if (promoType === "cashback") {
      payload.cashbackPercent = cashbackPercent;
      payload.cashbackScopes = cashbackScopes;
      payload.cashbackNeedMarkup = cashbackNeedMarkup;
      payload.cashbackPaymentDays = cashbackPaymentDays;
      payload.cashbackPaymentTiming = cashbackPaymentTiming;
      payload.cashbackPaymentTrigger = cashbackPaymentTrigger;
    } else if (promoType === "gift_product") {
      payload.giftProductCategory = giftProductCategory;
      payload.giftProductId = giftProductId;
      payload.giftProductNeedMarkup = giftProductNeedMarkup;
      payload.giftProductMarkupAmount = giftProductMarkupAmount;
      payload.giftProductCustomPrice = giftProductCustomPrice;
    } else if (promoType === "gift_service") {
      payload.giftServiceId = giftServiceId;
      payload.giftServiceNeedMarkup = giftServiceNeedMarkup;
      payload.giftServiceMarkupAmount = giftServiceMarkupAmount;
      payload.giftServiceCustomPrice = giftServiceCustomPrice;
    } else if (promoType === "installment") {
      payload.installmentPrograms = {
        "0-0-3": p3,
        "0-0-4": p4,
        "0-0-6": p6,
        "0-0-10": p10,
        "0-0-12": p12,
        "0-0-24": p24,
      };
      payload.installmentNeedMarkup = installmentNeedMarkup;
    }

    let updatedList: Promotion[] = [];
    if (editingPromo) {
      updatedList = promotions.map((p) => p.id === editingPromo.id ? payload : p);
    } else {
      updatedList = [...promotions, payload];
    }

    await savePromotions(updatedList);
    showAlert("Успех", editingPromo ? "Акция успешно изменена" : "Акция успешно создана");
    setIsCreating(false);
    resetForm();
  };

  const handleDelete = (id: string, promoName: string) => {
    showConfirm(
      "Удаление акции",
      `Вы уверены, что хотите удалить акцию "${promoName}"?`,
      async () => {
        const updatedList = promotions.filter((p) => p.id !== id);
        await savePromotions(updatedList);
        showAlert("Успех", "Акция успешно удалена");
      }
    );
  };

  const handleToggleActive = async (promo: Promotion) => {
    const updatedList = promotions.map((p) => {
      if (p.id === promo.id) {
        return { ...p, isActive: p.isActive === undefined ? false : !p.isActive };
      }
      return p;
    });
    await savePromotions(updatedList);
  };

  const toggleBuyerType = (type: "retail" | "wholesale" | "designer") => {
    if (buyerTypes.includes(type)) {
      setBuyerTypes(buyerTypes.filter((t) => t !== type));
    } else {
      setBuyerTypes([...buyerTypes, type]);
    }
  };

  const toggleDiscountScope = (scope: string) => {
    if (scope === "all_project") {
      setDiscountScopes(["all_project"]);
    } else {
      let current = discountScopes.filter(s => s !== "all_project");
      if (current.includes(scope)) {
        current = current.filter(s => s !== scope);
        if (current.length === 0) current = ["all_project"];
      } else {
        current.push(scope);
      }
      setDiscountScopes(current);
    }
  };

  const toggleCashbackScope = (scope: string) => {
    if (scope === "all_project") {
      setCashbackScopes(["all_project"]);
    } else {
      let current = cashbackScopes.filter(s => s !== "all_project");
      if (current.includes(scope)) {
        current = current.filter(s => s !== scope);
        if (current.length === 0) current = ["all_project"];
      } else {
        current.push(scope);
      }
      setCashbackScopes(current);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const parts = dateString.split("-");
    if (parts.length !== 3) return dateString;
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
  };

  const isProductionCompany = companyType === 'Производство' || companyType === 'Мебельное производство';
  
  // Filter products by selected category
  const filteredProducts = catalogProducts.filter((p) => {
    if (!giftProductCategory) return true;
    const cat = productCategories.find(c => c.id === giftProductCategory);
    return p.category === cat?.name;
  });

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Percent className="w-6 h-6 text-indigo-600" />
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Акции и Спецпредложения</h1>
          </div>
          <p className="text-sm text-gray-500">Управляйте бонусной программой, сезонными скидками и партнерскими предложениями</p>
        </div>

        {isAdminOrSupervisor && !isCreating && (
          <button
            onClick={() => { resetForm(); setIsCreating(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md font-semibold text-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            Создать акцию
          </button>
        )}
      </div>

      {isCreating ? (
        <form onSubmit={handleSave} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-500" />
              {editingPromo ? 'Редактировать акцию' : 'Настройка параметров новой акции'}
            </h2>
            <button
              type="button"
              onClick={() => { setIsCreating(false); resetForm(); }}
              className="px-3 py-1.5 border border-gray-200 text-gray-500 hover:bg-gray-50 rounded-xl text-xs font-semibold"
            >
              Отмена
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Название акции</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Например: Весенняя скидка на фурнитуру"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 focus:border-indigo-500 focus:bg-white rounded-xl text-sm transition-all focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Старт действия</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 focus:border-indigo-500 focus:bg-white rounded-xl text-sm transition-all focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Конец действия</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 focus:border-indigo-500 focus:bg-white rounded-xl text-sm transition-all focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Совместимость (Пересечение)</label>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setAllowOverlap(true)}
                    className={cn(
                      "flex-1 py-2 px-4 rounded-xl border text-sm font-semibold transition-all",
                      allowOverlap 
                        ? "bg-indigo-50 text-indigo-600 border-indigo-200 shadow-sm" 
                        : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                    )}
                  >
                    Да, комбинируется
                  </button>
                  <button
                    type="button"
                    onClick={() => setAllowOverlap(false)}
                    className={cn(
                      "flex-1 py-2 px-4 rounded-xl border text-sm font-semibold transition-all",
                      !allowOverlap 
                        ? "bg-indigo-50 text-indigo-600 border-indigo-200 shadow-sm" 
                        : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                    )}
                  >
                    Нет, исключает другие
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Для каких покупателей
                </label>
                <div className="flex flex-wrap gap-2">
                  {isProductionCompany ? (
                    <>
                      <button
                        type="button"
                        onClick={() => toggleBuyerType("retail")}
                        className={cn(
                          "px-4 py-2 rounded-xl border text-xs font-bold transition-all",
                          buyerTypes.includes("retail")
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                            : "bg-gray-50 text-gray-650 border-gray-200 hover:bg-gray-100"
                        )}
                      >
                        Розница
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleBuyerType("wholesale")}
                        className={cn(
                          "px-4 py-2 rounded-xl border text-xs font-bold transition-all",
                          buyerTypes.includes("wholesale")
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                            : "bg-gray-50 text-gray-650 border-gray-200 hover:bg-gray-100"
                        )}
                      >
                        Салон
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleBuyerType("designer")}
                        className={cn(
                          "px-4 py-2 rounded-xl border text-xs font-bold transition-all",
                          buyerTypes.includes("designer")
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                            : "bg-gray-50 text-gray-650 border-gray-200 hover:bg-gray-100"
                        )}
                      >
                        Дизайнеры
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="px-4 py-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 text-xs font-bold"
                    >
                      Розница (предустановлено)
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Тип акции</label>
                <select
                  value={promoType}
                  onChange={(e) => setPromoType(e.target.value as Promotion['promoType'])}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 focus:border-indigo-500 focus:bg-white rounded-xl text-sm transition-all focus:outline-none font-medium"
                >
                  <option value="discount">Скидка (%)</option>
                  <option value="cashback">Кэшбек (%)</option>
                  <option value="gift_product">Товар в подарок</option>
                  <option value="gift_service">Услуга в подарок</option>
                  <option value="installment">Рассрочка</option>
                </select>
              </div>

              {/* Promo Context specific UI */}
              {promoType === "discount" && (
                <div className="p-4 bg-gray-55/40 border border-gray-100 rounded-2xl space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5">Процент скидки (%)</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={discountPercent || ''}
                      onChange={(e) => setDiscountPercent(parseInt(e.target.value) || 0)}
                      className="w-full px-4 py-2 border border-gray-200 focus:border-indigo-500 rounded-xl text-sm"
                      placeholder="Например: 10"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5">На что распространяется:</label>
                    <div className="grid grid-cols-2 gap-2 bg-white p-3 rounded-xl border border-gray-100">
                      {Object.entries(SCOPES_TRANSLATIONS).map(([key, label]) => (
                        <label key={key} className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={discountScopes.includes(key)}
                            onChange={() => toggleDiscountScope(key)}
                            className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5">Требуется ли наценка?</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                        <input
                          type="radio"
                          name="discount_markup"
                          checked={discountNeedMarkup === true}
                          onChange={() => setDiscountNeedMarkup(true)}
                          className="text-indigo-650 focus:ring-indigo-500"
                        />
                        Да (наценка на сумму скидки)
                      </label>
                      <label className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                        <input
                          type="radio"
                          name="discount_markup"
                          checked={discountNeedMarkup === false}
                          onChange={() => setDiscountNeedMarkup(false)}
                          className="text-indigo-650 focus:ring-indigo-500"
                        />
                        Нет (прямая скидка)
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {promoType === "cashback" && (
                <div className="p-4 bg-gray-55/40 border border-gray-100 rounded-2xl space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1.5">Процент кэшбека (%)</label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={cashbackPercent || ''}
                        onChange={(e) => setCashbackPercent(parseInt(e.target.value) || 0)}
                        className="w-full px-4 py-2 border border-gray-200 focus:border-indigo-500 rounded-xl text-sm"
                        placeholder="Например: 5"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1.5">Срок выплаты (дней)</label>
                      <input
                        type="number"
                        min="0"
                        value={cashbackPaymentDays || ''}
                        onChange={(e) => setCashbackPaymentDays(parseInt(e.target.value) || 0)}
                        className="w-full px-4 py-2 border border-gray-200 focus:border-indigo-500 rounded-xl text-sm"
                        placeholder="Например: 14"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1.5">Когда выплачивать</label>
                      <select
                        value={cashbackPaymentTiming}
                        onChange={(e) => setCashbackPaymentTiming(e.target.value as "before" | "after")}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-semibold"
                      >
                        <option value="before">До даты</option>
                        <option value="after">После даты</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1.5">Событие триггера</label>
                      <select
                        value={cashbackPaymentTrigger}
                        onChange={(e) => setCashbackPaymentTrigger(e.target.value as Promotion['cashbackPaymentTrigger'])}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-semibold"
                      >
                        <option value="advance">Оплаты аванса</option>
                        <option value="full_payment">Полной оплаты договора</option>
                        <option value="delivery">Доставки</option>
                        <option value="assembly">Сборки</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5">На что начисляется:</label>
                    <div className="grid grid-cols-2 gap-2 bg-white p-3 rounded-xl border border-gray-100">
                      {Object.entries(SCOPES_TRANSLATIONS).map(([key, label]) => (
                        <label key={key} className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={cashbackScopes.includes(key)}
                            onChange={() => toggleCashbackScope(key)}
                            className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5">Требуется ли наценка?</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                        <input
                          type="radio"
                          name="cashback_markup"
                          checked={cashbackNeedMarkup === true}
                          onChange={() => setCashbackNeedMarkup(true)}
                          className="text-indigo-650 focus:ring-indigo-500"
                        />
                        Да (наценка на сумму кэшбека)
                      </label>
                      <label className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                        <input
                          type="radio"
                          name="cashback_markup"
                          checked={cashbackNeedMarkup === false}
                          onChange={() => setCashbackNeedMarkup(false)}
                          className="text-indigo-650 focus:ring-indigo-500"
                        />
                        Нет (оригинальная цена)
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {promoType === "gift_product" && (
                <div className="p-4 bg-gray-55/40 border border-gray-100 rounded-2xl space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1.5">Категория подарка</label>
                      <select
                        value={giftProductCategory}
                        onChange={(e) => { setGiftProductCategory(e.target.value); setGiftProductId(''); }}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium"
                        required
                      >
                        <option value="">-- Выбрать категорию --</option>
                        {productCategories.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1.5">Подарочный товар</label>
                      <select
                        value={giftProductId}
                        onChange={(e) => setGiftProductId(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium"
                        required
                      >
                        <option value="">-- Выбрать Товар --</option>
                        {filteredProducts.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5">Требуется ли наценка?</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer">
                        <input
                          type="radio"
                          name="gift_product_markup"
                          checked={giftProductNeedMarkup === true}
                          onChange={() => setGiftProductNeedMarkup(true)}
                          className="text-indigo-650 focus:ring-indigo-500"
                        />
                        Да (задать наценку)
                      </label>
                      <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer">
                        <input
                          type="radio"
                          name="gift_product_markup"
                          checked={giftProductNeedMarkup === false}
                          onChange={() => setGiftProductNeedMarkup(false)}
                          className="text-indigo-650 focus:ring-indigo-500"
                        />
                        Нет (особая цена товара)
                      </label>
                    </div>
                  </div>

                  {giftProductNeedMarkup ? (
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1.5">Сумма наценки (₽)</label>
                      <input
                        type="number"
                        value={giftProductMarkupAmount || ''}
                        onChange={(e) => setGiftProductMarkupAmount(parseInt(e.target.value) || 0)}
                        className="w-full px-4 py-2 border border-gray-200 focus:border-indigo-500 rounded-xl text-sm"
                        placeholder="Например: 5000"
                        required
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1.5">Продавать этот товар за (₽)</label>
                      <input
                        type="number"
                        value={giftProductCustomPrice !== undefined ? giftProductCustomPrice : ''}
                        onChange={(e) => setGiftProductCustomPrice(parseInt(e.target.value) || 0)}
                        className="w-full px-4 py-2 border border-gray-200 focus:border-indigo-500 rounded-xl text-sm"
                        placeholder="Например: 0 (бесплатно) или 1"
                        required
                      />
                    </div>
                  )}
                </div>
              )}

              {promoType === "gift_service" && (
                <div className="p-4 bg-gray-55/40 border border-gray-100 rounded-2xl space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5">Выберите услугу</label>
                    <select
                      value={giftServiceId}
                      onChange={(e) => setGiftServiceId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-medium"
                      required
                    >
                      <option value="">-- Выбрать услугу --</option>
                      <option value="assembly">Сборка (Базовый пакет сборки)</option>
                      {catalogServices.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5">Требуется ли наценка?</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer">
                        <input
                          type="radio"
                          name="gift_service_markup"
                          checked={giftServiceNeedMarkup === true}
                          onChange={() => setGiftServiceNeedMarkup(true)}
                          className="text-indigo-650 focus:ring-indigo-500"
                        />
                        Да (наценить весь проект)
                      </label>
                      <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer">
                        <input
                          type="radio"
                          name="gift_service_markup"
                          checked={giftServiceNeedMarkup === false}
                          onChange={() => setGiftServiceNeedMarkup(false)}
                          className="text-indigo-650 focus:ring-indigo-500"
                        />
                        Нет (особая цена услуги)
                      </label>
                    </div>
                  </div>

                  {giftServiceNeedMarkup ? (
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1.5">Сумма наценки (₽)</label>
                      <input
                        type="number"
                        value={giftServiceMarkupAmount || ''}
                        onChange={(e) => setGiftServiceMarkupAmount(parseInt(e.target.value) || 0)}
                        className="w-full px-4 py-2 border border-gray-200 focus:border-indigo-500 rounded-xl text-sm"
                        placeholder="Например: 3000"
                        required
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1.5">
                        {giftServiceId === 'assembly' ? 'Процент за сборку по акции (%)' : 'Продавать эту услугу за (₽)'}
                      </label>
                      <input
                        type="number"
                        value={giftServiceCustomPrice !== undefined ? giftServiceCustomPrice : ''}
                        onChange={(e) => setGiftServiceCustomPrice(parseFloat(e.target.value) || 0)}
                        className="w-full px-4 py-2 border border-gray-200 focus:border-indigo-500 rounded-xl text-sm"
                        placeholder={giftServiceId === 'assembly' ? "Например: 0 (%) или 5 (%)" : "Например: 1 (руб) или 0"}
                        required
                      />
                    </div>
                  )}
                </div>
              )}

              {promoType === "installment" && (
                <div className="p-4 bg-gray-55/40 border border-gray-100 rounded-2xl space-y-4">
                  <span className="block text-xs font-bold text-gray-500 mb-2">Настройка программ и условий банка:</span>
                  
                  <div className="space-y-3 bg-white p-3 rounded-2xl border border-gray-100 max-h-[220px] overflow-y-auto">
                    {[
                      { state: p3, set: setP3, title: "0-0-3 (3 месяца)" },
                      { state: p4, set: setP4, title: "0-0-4 (4 месяца)" },
                      { state: p6, set: setP6, title: "0-0-6 (6 месяцев)" },
                      { state: p10, set: setP10, title: "0-0-10 (10 месяцев)" },
                      { state: p12, set: setP12, title: "0-0-12 (12 месяцев)" },
                      { state: p24, set: setP24, title: "0-0-24 (24 месяца)" },
                    ].map((prog, index) => (
                      <div key={index} className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-50 pb-2 last:border-0 last:pb-0 gap-2">
                        <label className="flex items-center gap-2 text-xs font-extrabold text-gray-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={prog.state.enabled}
                            onChange={(e) => prog.set({ ...prog.state, enabled: e.target.checked })}
                            className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                          />
                          {prog.title}
                        </label>
                        {prog.state.enabled && (
                          <div className="flex gap-2 items-center">
                            <input
                              type="number"
                              placeholder="% Банка"
                              value={prog.state.bankPercent || ''}
                              onChange={(e) => prog.set({ ...prog.state, bankPercent: parseFloat(e.target.value) || 0 })}
                              className="w-16 px-1.5 py-0.5 border rounded-lg text-xs"
                              required
                            />
                            <span className="text-[10px] text-gray-400 font-bold">%</span>
                            <input
                              type="number"
                              placeholder="Макс сумма"
                              value={prog.state.maxAmount || ''}
                              onChange={(e) => prog.set({ ...prog.state, maxAmount: parseInt(e.target.value) || 0 })}
                              className="w-24 px-1.5 py-0.5 border rounded-lg text-xs"
                              required
                            />
                            <span className="text-[10px] text-gray-400 font-bold">₽</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5">Требуется ли наценка на проект?</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer">
                        <input
                          type="radio"
                          name="installment_markup"
                          checked={installmentNeedMarkup === true}
                          onChange={() => setInstallmentNeedMarkup(true)}
                          className="text-indigo-650 focus:ring-indigo-500"
                        />
                        Да (наценить на процент банка)
                      </label>
                      <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer">
                        <input
                          type="radio"
                          name="installment_markup"
                          checked={installmentNeedMarkup === false}
                          onChange={() => setInstallmentNeedMarkup(false)}
                          className="text-indigo-650 focus:ring-indigo-500"
                        />
                        Нет (без изменений суммы проекта)
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-gray-100 pt-5">
            <button
              type="button"
              onClick={() => { setIsCreating(false); resetForm(); }}
              className="px-5 py-2 border border-gray-250 text-gray-700 rounded-xl hover:bg-gray-50 text-sm font-semibold transition-all"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md font-semibold text-sm transition-all"
            >
              Добавить акцию
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          {promotions.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-150 p-12 text-center flex flex-col items-center justify-center max-w-lg mx-auto">
              <Gift className="w-12 h-12 text-gray-300 mb-4 animate-pulse" />
              <h3 className="text-base font-bold text-gray-800 mb-1">Нет активных акций</h3>
              <p className="text-xs text-gray-400 mb-6">В данный момент акции или специальные программы не настроены в вашей компании</p>
              {isAdminOrSupervisor && (
                <button
                  onClick={() => setIsCreating(true)}
                  className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl text-xs hover:bg-indigo-700 shadow-sm"
                >
                  Создать первую акцию
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {promotions.map((promo) => {
                const isPromoActive = () => {
                  if (promo.isActive === false) return false;
                  const today = new Date().toISOString().split('T')[0];
                  return today >= promo.startDate && today <= promo.endDate;
                };

                const isCurrentActive = isPromoActive();

                return (
                  <div 
                    key={promo.id} 
                    className={cn(
                      "bg-white rounded-2xl border transition-all p-5 shadow-sm space-y-4 relative flex flex-col justify-between",
                      isCurrentActive 
                        ? "border-emerald-250 hover:shadow-md hover:border-emerald-400" 
                        : "border-gray-200 opacity-80"
                    )}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                          {promo.promoType === "discount" && <Percent className="w-5 h-5 text-indigo-600" />}
                          {promo.promoType === "cashback" && <Tag className="w-5 h-5 text-indigo-600" />}
                          {promo.promoType === "gift_product" && <ShoppingBag className="w-5 h-5 text-indigo-600" />}
                          {promo.promoType === "gift_service" && <Gift className="w-5 h-5 text-indigo-600" />}
                          {promo.promoType === "installment" && <Calendar className="w-5 h-5 text-indigo-600" />}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span 
                            className={cn(
                              "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full",
                              isCurrentActive 
                                ? "bg-emerald-50 text-emerald-600" 
                                : "bg-gray-100 text-gray-400"
                            )}
                          >
                            {isCurrentActive ? "Активна" : "Неактивна"}
                          </span>

                          {isAdminOrSupervisor && (
                            <button
                              onClick={() => handleToggleActive(promo)}
                              className="text-gray-400 hover:text-indigo-600 p-1"
                              title="Выключить/Включить вручную"
                            >
                              {promo.isActive !== false ? (
                                <CheckCircle className="w-4 h-4 text-emerald-500" />
                              ) : (
                                <Info className="w-4 h-4 text-gray-300" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="mt-3">
                        <h3 className="font-bold text-gray-900 text-base leading-tight mb-1">{promo.name}</h3>
                        <p className="text-[11px] text-gray-400 font-bold flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          Сроки: {formatDate(promo.startDate)} — {formatDate(promo.endDate)}
                        </p>
                      </div>

                      {/* Promotion content view depending on type */}
                      <div className="mt-4 p-3 bg-gray-50 rounded-xl space-y-2 text-xs">
                        {promo.promoType === "discount" && (
                          <>
                            <div className="flex justify-between">
                              <span className="text-gray-400 font-medium">Скидка:</span>
                              <span className="font-extrabold text-indigo-600">{promo.discountPercent}%</span>
                            </div>
                            {isAdminOrSupervisor && (
                              <div className="flex justify-between">
                                <span className="text-gray-400 font-medium">С наценкой:</span>
                                <span className="font-semibold text-gray-700">{promo.discountNeedMarkup ? 'Да' : 'Нет'}</span>
                              </div>
                            )}
                            <div className="flex flex-col mt-1 gap-1 border-t border-gray-100 pt-1.5">
                              <span className="text-[10px] text-gray-400 font-extrabold uppercase">Распространение:</span>
                              <span className="font-medium text-gray-650">
                                {promo.discountScopes?.includes("all_project") 
                                  ? "Весь проект" 
                                  : promo.discountScopes?.map(s => SCOPES_TRANSLATIONS[s] || s).join(', ')}
                              </span>
                            </div>
                          </>
                        )}

                        {promo.promoType === "cashback" && (
                          <>
                            <div className="flex justify-between">
                              <span className="text-gray-400 font-medium">Кэшбек:</span>
                              <span className="font-extrabold text-indigo-600">{promo.cashbackPercent}%</span>
                            </div>
                            {isAdminOrSupervisor && (
                              <div className="flex justify-between">
                                <span className="text-gray-400 font-medium">С наценкой:</span>
                                <span className="font-semibold text-gray-700">{promo.cashbackNeedMarkup ? 'Да' : 'Нет'}</span>
                              </div>
                            )}
                            <div className="flex flex-col font-medium text-gray-650 border-t border-gray-100 pt-1">
                              <span>Выплата: {promo.cashbackPaymentDays} дн. {promo.cashbackPaymentTiming === 'after' ? 'после' : 'до'}{" "}
                              {promo.cashbackPaymentTrigger === 'full_payment' ? 'полной оплаты' : promo.cashbackPaymentTrigger === 'advance' ? 'аванса' : promo.cashbackPaymentTrigger === 'assembly' ? 'сборки' : 'доставки'}</span>
                            </div>
                          </>
                        )}

                        {promo.promoType === "gift_product" && (
                          <>
                            <div className="flex flex-col">
                              <span className="text-gray-400 font-medium">Подарочный товар:</span>
                              <span className="font-bold text-gray-800">
                                {catalogProducts.find(p => p.id === promo.giftProductId)?.name || "Выбранный товар"}
                              </span>
                            </div>
                            {isAdminOrSupervisor && (
                              <div className="flex justify-between">
                                <span className="text-gray-400 font-medium">С наценкой:</span>
                                <span className="font-semibold text-gray-700">{promo.giftProductNeedMarkup ? `Да (+${promo.giftProductMarkupAmount}₽)` : `Нет (Цена: ${promo.giftProductCustomPrice}₽)`}</span>
                              </div>
                            )}
                          </>
                        )}

                        {promo.promoType === "gift_service" && (
                          <>
                            <div className="flex flex-col">
                              <span className="text-gray-400 font-medium">Подарочная услуга:</span>
                              <span className="font-bold text-gray-800">
                                {promo.giftServiceId === 'assembly' ? 'Сборка мебели' : (catalogServices.find(s => s.id === promo.giftServiceId)?.name || 'Выбранная услуга')}
                              </span>
                            </div>
                            {isAdminOrSupervisor && (
                              <div className="flex justify-between">
                                <span className="text-gray-400 font-medium font-semibold text-gray-700">Наценка / Цена:</span>
                                <span>{promo.giftServiceNeedMarkup ? `Наценка (+${promo.giftServiceMarkupAmount}₽)` : `Цена: ${promo.giftServiceCustomPrice}${promo.giftServiceId === 'assembly' ? '%' : '₽'}`}</span>
                              </div>
                            )}
                          </>
                        )}

                        {promo.promoType === "installment" && (
                          <>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[10px] text-gray-400 font-extrabold uppercase">Программы рассрочки:</span>
                              <div className="space-y-1 font-medium mt-1">
                                {Object.entries(promo.installmentPrograms || {}).filter(([_, val]) => val.enabled).map(([key, val]) => (
                                  <div key={key} className="flex justify-between items-center text-[11px] border-b border-gray-100 last:border-0 pb-1">
                                    <span className="font-extrabold text-gray-700">{key}</span>
                                    <span className="text-gray-500">Банк: {val.bankPercent}% (до {val.maxAmount}₽)</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                            {isAdminOrSupervisor && (
                              <div className="flex justify-between border-t border-gray-100 pt-1 text-[11px]">
                                <span className="text-gray-400 font-medium">С наценкой банка:</span>
                                <span className="font-bold">{promo.installmentNeedMarkup ? 'Да' : 'Нет'}</span>
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-1">
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mr-1 my-1">Покупатели:</span>
                        {promo.buyerTypes.map((b) => (
                          <span key={b} className="text-[10px] font-bold px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                            {b === 'retail' ? 'Розница' : b === 'wholesale' ? 'Салон' : 'Дизайнер'}
                          </span>
                        ))}
                      </div>

                      <div className="mt-3 flex justify-between items-center pt-3 border-t border-gray-50">
                        <span className="text-[10px] font-bold text-gray-400">
                          {promo.allowOverlap ? "Совместима с др. акциями" : "Единичная (без пересечений)"}
                        </span>
                      </div>
                    </div>

                    {isAdminOrSupervisor && (
                      <div className="mt-4 flex gap-2 pt-3 border-t border-gray-100">
                        <button
                          type="button"
                          onClick={() => handleEdit(promo)}
                          className="flex-1 py-1.5 focus:outline-none border border-gray-250 text-gray-750 hover:bg-gray-50 font-semibold text-xs rounded-lg transition-all"
                        >
                          Редактировать
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(promo.id, promo.name)}
                          className="px-2.5 py-1.5 border border-red-100 text-red-600 hover:bg-red-50 rounded-lg text-xs"
                          title="Удалить"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

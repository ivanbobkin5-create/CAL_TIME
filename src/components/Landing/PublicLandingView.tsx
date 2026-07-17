import { useState, useEffect, useMemo } from "react";
import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  Phone, 
  Mail, 
  MapPin, 
  Search, 
  Check, 
  Loader2, 
  X, 
  ImageIcon, 
  Eye, 
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Sparkles,
  Link2
} from "lucide-react";

interface PublicLandingViewProps {
  aliasOrId: string;
}

const GRADIENT_CLASSES: Record<string, string> = {
  "blue-indigo": "from-blue-600 to-indigo-700",
  "emerald-teal": "from-emerald-600 to-teal-700",
  "slate-gray": "from-slate-700 to-slate-900",
  "orange-rose": "from-orange-500 to-rose-600",
  "purple-violet": "from-purple-600 to-violet-800",
};

export function PublicLandingView({ aliasOrId }: PublicLandingViewProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [company, setCompany] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [generalSettings, setGeneralSettings] = useState<any>(null);
  const [prices, setPrices] = useState<Record<string, number>>({});
  
  // Shopping Cart state
  const [cart, setCart] = useState<Record<string, { product: any; qty: number; price: number }>>({});
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<{ min: string, max: string }>({ min: "", max: "" });
  const [selectedProductDetail, setSelectedProductDetail] = useState<any | null>(null);
  const [selectedVariationId, setSelectedVariationId] = useState<string | null>(null);
  
  // Checkout Form state
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerComment, setCustomerComment] = useState("");
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);

  // Fetch public data on load
  useEffect(() => {
    // Try to load from cache first for instant render
    const cacheKey = `meb_public_cache:${aliasOrId}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const data = JSON.parse(cached);
        if (data.company) {
          setCompany(data.company);
          setProducts(data.products || []);
          setGeneralSettings(data.generalSettings);
          setPrices(data.prices || {});
          
          const cats = Array.from(new Set((data.products || []).map((p: any) => p.category))) as string[];
          if (cats.length > 0 && !selectedCategory) {
            setSelectedCategory(cats[0]);
          }
          setLoading(false); // Instant load
        }
      } catch (_) {}
    }

    async function loadPublicData() {
      try {
        if (!cached) setLoading(true);
        setError(null);
        const res = await fetch(`/api/public/company/${aliasOrId}`);
        if (!res.ok) {
          if (res.status === 404) {
            throw new Error("Компания или страница каталога не найдена");
          }
          throw new Error("Не удалось загрузить каталог товаров");
        }
        const data = await res.json();
        
        // Save to cache for next time
        try {
          localStorage.setItem(cacheKey, JSON.stringify(data));
        } catch (e) {
          console.warn("Failed to save public landing cache:", e);
          // If quota exceeded, clear all public landing caches to make room
          if (e instanceof Error && e.name === 'QuotaExceededError') {
             Object.keys(localStorage).forEach(key => {
               if (key.startsWith('meb_public_cache:')) {
                 localStorage.removeItem(key);
               }
             });
          }
        }
        
        setCompany(data.company);
        setProducts(data.products || []);
        setGeneralSettings(data.generalSettings);
        setPrices(data.prices || {});
        
        // Auto-select first category if none selected
        const cats = Array.from(new Set((data.products || []).map((p: any) => p.category))) as string[];
        if (cats.length > 0 && !selectedCategory) {
          setSelectedCategory(cats[0]);
        }
      } catch (err: any) {
        if (!cached) setError(err.message || "Ошибка соединения с сервером");
      } finally {
        setLoading(false);
      }
    }
    loadPublicData();
  }, [aliasOrId]);

  // Compute standard retail coefficient
  const getProductCoefficient = (product: any): number => {
    if (!generalSettings) return 1.5; // fallback
    
    // Resolve brand coefficients
    const brand = product.brand || "";
    const categoryId = `cat_${product.category}`;
    
    // If custom coeffs are used
    if (product.useCustomCoeffs) {
      if (product.customCoeffRetail !== undefined && product.customCoeffRetail > 0) {
        return product.customCoeffRetail;
      }
    }
    
    // Fallback to resolve brand coefficient in generalSettings
    const bCoeffs = generalSettings.coefficients?.retail || {};
    const catCoeffs = bCoeffs[categoryId];
    
    if (catCoeffs) {
      if (typeof catCoeffs === "object") {
        return catCoeffs[brand] || catCoeffs["standard"] || 1.5;
      }
      return parseFloat(catCoeffs) || 1.5;
    }
    
    return 1.5;
  };

  // Calculate retail price for a product
  const getProductRetailPrice = (product: any, variationId?: string | null): number => {
    const coeff = getProductCoefficient(product);
    
    let basePrice = product.purchasePrice !== undefined ? product.purchasePrice : (product.price || 0);
    
    if (variationId && product.variations) {
      const variation = product.variations.find((v: any) => v.id === variationId);
      if (variation) {
        basePrice = variation.purchasePrice;
      }
    }
    
    let mainPrice = Math.round(basePrice * coeff);

    // If there are required companion products included, add their retail prices as well!
    if (product.requiredProducts && product.requiredProducts.length > 0) {
      let companionTotal = 0;
      product.requiredProducts.forEach((rp: any) => {
        const cp = products.find((item: any) => String(item.id) === String(rp.id));
        if (cp) {
          const cpCoeff = getProductCoefficient(cp);
          const cpBasePrice = cp.purchasePrice !== undefined ? cp.purchasePrice : (cp.price || 0);
          companionTotal += rp.qty * Math.round(cpBasePrice * cpCoeff);
        }
      });
      mainPrice += companionTotal;
    }

    return mainPrice;
  };

  // Get categories and brands list
  const categories = useMemo(() => {
    const landing = company?.landingPage || {};
    const baseCategories = Array.from(new Set(products.map(p => p.category))) as string[];
    
    return baseCategories.filter(cat => {
      if (cat === "Акционные товары") {
        return landing.showPromoSection && landing.promoDisplayType === "category";
      }
      return true;
    });
  }, [products, company]);

  const promoProducts = useMemo(() => {
    return products.filter(p => p.category === "Акционные товары");
  }, [products]);

  const [activePromoIndex, setActivePromoIndex] = useState(0);

  useEffect(() => {
    if (promoProducts.length > 1) {
      const interval = setInterval(() => {
        setActivePromoIndex(prev => (prev + 1) % promoProducts.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [promoProducts]);

  const availableBrands = useMemo(() => {
    const brands = products
      .filter(p => !selectedCategory || p.category === selectedCategory)
      .map(p => p.brand)
      .filter(Boolean);
    return Array.from(new Set(brands)) as string[];
  }, [products, selectedCategory]);
  
  // Filter products matching category, search, brands and price
  const filteredProducts = useMemo(() => {
    const landing = company?.landingPage || {};
    return products.filter(p => {
      // If promo section is disabled, hide all promo products from main grid
      if (p.category === "Акционные товары" && !landing.showPromoSection) {
        return false;
      }
      
      const matchesCategory = !selectedCategory || p.category === selectedCategory;
      
      const searchLower = search.toLowerCase();
      const matchesSearch = !search || 
        p.name.toLowerCase().includes(searchLower) || 
        (p.article && p.article.toLowerCase().includes(searchLower)) ||
        (p.description && p.description.toLowerCase().includes(searchLower)) ||
        (p.variations && Array.isArray(p.variations) && p.variations.some((v: any) => 
          v.name.toLowerCase().includes(searchLower) || 
          (v.article && v.article.toLowerCase().includes(searchLower))
        ));
        
      const matchesBrand = selectedBrands.length === 0 || selectedBrands.includes(p.brand);
      
      const retailPrice = getProductRetailPrice(p);
      const matchesMinPrice = !priceRange.min || retailPrice >= parseFloat(priceRange.min);
      const matchesMaxPrice = !priceRange.max || retailPrice <= parseFloat(priceRange.max);

      return matchesCategory && matchesSearch && matchesBrand && matchesMinPrice && matchesMaxPrice;
    });
  }, [products, selectedCategory, search, selectedBrands, priceRange, getProductRetailPrice]);

  // Cart operations
  const addToCart = (product: any, variationId?: string | null) => {
    const price = getProductRetailPrice(product, variationId);
    const cartKey = variationId ? `${product.id}_${variationId}` : product.id;
    
    setCart(prev => {
      const existing = prev[cartKey];
      return {
        ...prev,
        [cartKey]: {
          product,
          variationId: variationId || undefined,
          qty: (existing?.qty || 0) + 1,
          price
        }
      };
    });
  };

  const removeFromCart = (productId: string, variationId?: string | null) => {
    const cartKey = variationId ? `${productId}_${variationId}` : productId;
    setCart(prev => {
      const existing = prev[cartKey];
      if (!existing) return prev;
      
      const next = { ...prev };
      if (existing.qty <= 1) {
        delete next[cartKey];
      } else {
        next[cartKey] = {
          ...existing,
          qty: existing.qty - 1
        };
      }
      return next;
    });
  };

  const deleteFromCart = (cartKey: string) => {
    setCart(prev => {
      const next = { ...prev };
      delete next[cartKey];
      return next;
    });
  };

  const updateCartQty = (cartKey: string, val: number) => {
    if (val <= 0) {
      deleteFromCart(cartKey);
      return;
    }
    setCart(prev => {
      const existing = prev[cartKey];
      if (!existing) return prev;
      return {
        ...prev,
        [cartKey]: {
          ...existing,
          qty: val
        }
      };
    });
  };

  // Totals calculations
  const totalCartCount = Object.values(cart).reduce((acc, item) => acc + item.qty, 0);
  const totalCartPrice = Object.values(cart).reduce((acc, item) => acc + (item.qty * item.price), 0);

  // Submit Order to backend
  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !customerPhone) return;

    try {
      setSubmittingOrder(true);
      
      // Map cart items for backend saving
      const cartItems = Object.values(cart).map((item: any) => {
        const variation = item.variationId ? item.product.variations?.find((v: any) => v.id === item.variationId) : null;
        return {
          id: item.product.id,
          name: variation ? `${item.product.name} (${variation.name})` : item.product.name,
          article: variation?.article || item.product.article || "",
          category: item.product.category,
          quantity: item.qty,
          price: item.price,
          purchasePrice: variation ? variation.purchasePrice : (item.product.purchasePrice || item.product.price || 0),
          brand: item.product.brand || "",
          images: item.product.images || [],
          variationId: item.variationId || null
        };
      });

      const res = await fetch(`/api/public/company/${company.id}/order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          customerPhone,
          customerEmail,
          customerComment,
          cartItems,
          totalPrice: totalCartPrice
        })
      });

      if (!res.ok) throw new Error("Не удалось отправить заказ");
      const result = await res.json();
      
      setOrderSuccess(result.orderId);
      setCart({}); // clear cart
      setCustomerName("");
      setCustomerPhone("");
      setCustomerEmail("");
      setCustomerComment("");
      setIsCartOpen(false);
    } catch (err) {
      alert("Не удалось отправить заказ. Пожалуйста, попробуйте еще раз или свяжитесь с нами напрямую по телефону.");
    } finally {
      setSubmittingOrder(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 select-none">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
        <div className="font-extrabold text-gray-800 text-lg">Загрузка онлайн-витрины...</div>
        <p className="text-sm text-gray-400 mt-2">Пожалуйста, подождите, мы собираем актуальные товары</p>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl max-w-md text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-6">
            <X className="w-8 h-8" strokeWidth={2.5} />
          </div>
          <h2 className="text-xl font-black text-gray-900 mb-2">Каталог не найден</h2>
          <p className="text-sm text-gray-500 mb-6 leading-relaxed">
            {error || "Запрошенная страница витрины компании в данный момент не настроена или недоступна."}
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full py-3 bg-gray-900 text-white font-bold rounded-2xl hover:bg-gray-800 transition-colors"
          >
            Обновить страницу
          </button>
        </div>
      </div>
    );
  }

  const landing = company.landingPage || {};
  const hasLandingConfig = Object.keys(landing).length > 0;
  
  // Custom theme colors
  const heroGradClass = GRADIENT_CLASSES[landing.heroBackground] || GRADIENT_CLASSES["blue-indigo"];
  const displayTitle = landing.title || `Каталог товаров ${company.name}`;
  const displayDesc = landing.description || "Выбирайте готовые модули, формируйте комплект и моментально оформляйте запрос розничного расчета.";
  const displayWelcome = landing.welcomeText || "";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-800 selection:bg-blue-600 selection:text-white relative">
      {/* Top Floating Contact Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-md shadow-blue-500/20">
              {company.name ? company.name[0].toUpperCase() : "C"}
            </div>
            <div>
              <h1 className="font-black text-base text-gray-900 tracking-tight leading-tight">{company.name}</h1>
              {company.city && <span className="text-[10px] uppercase font-black text-gray-400 tracking-wider flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3 text-gray-300" /> {company.city}</span>}
            </div>
          </div>

          <div className="flex items-center gap-4 sm:gap-6">
            {landing.phone && (
              <a 
                href={`tel:${landing.phone}`} 
                className="hidden sm:flex items-center gap-2 text-sm font-bold text-gray-900 hover:text-blue-600 transition-colors"
              >
                <Phone className="w-4 h-4 text-blue-500" />
                {landing.phone}
              </a>
            )}

            {/* Quick Messengers */}
            <div className="flex items-center gap-2">
              {landing.whatsapp && (
                <a 
                  href={`https://wa.me/${landing.whatsapp.replace(/[^0-9]/g, "")}`} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="p-2 bg-green-50 hover:bg-green-100 text-green-600 rounded-xl transition-all"
                  title="Написать в WhatsApp"
                >
                  <MessageSquare className="w-4.5 h-4.5 fill-current" />
                </a>
              )}
              {landing.telegram && (
                <a 
                  href={`https://t.me/${landing.telegram}`} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="p-2 bg-sky-50 hover:bg-sky-100 text-sky-600 rounded-xl transition-all"
                  title="Написать в Telegram"
                >
                  <Link2 className="w-4.5 h-4.5" />
                </a>
              )}
            </div>

            {/* Cart Button */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-lg shadow-blue-500/10"
            >
              <ShoppingCart className="w-5 h-5" />
              {totalCartCount > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full leading-none min-w-[18px] flex items-center justify-center">
                  {totalCartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Hero Banner Area */}
      <section className={`bg-gradient-to-r ${heroGradClass} text-white py-16 px-4 select-none relative overflow-hidden`}>
        <div className="absolute inset-0 bg-black/10 mix-blend-multiply" />
        <div className="max-w-7xl mx-auto text-center relative z-10 space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 backdrop-blur rounded-full text-xs font-bold tracking-wider text-blue-50">
            <Sparkles className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
            ОФИЦИАЛЬНАЯ ВИТРИНА МАГАЗИНА
          </div>
          <h2 className="text-3xl md:text-5xl font-black tracking-tight leading-tight max-w-4xl mx-auto">
            {displayTitle}
          </h2>
          <p className="text-base md:text-lg text-blue-100 max-w-2xl mx-auto leading-relaxed">
            {displayDesc}
          </p>
        </div>
      </section>

      {/* Main Content Workspace */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 flex flex-col md:flex-row gap-8">
        
        {/* Left Side: Dynamic Categories & Search */}
        <aside className="w-full md:w-64 flex-shrink-0 space-y-6">
          {/* Promo Slider in Sidebar */}
          {landing.showPromoSection && landing.promoDisplayType === "slider" && promoProducts.length > 0 && (
            <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-3xl p-0.5 shadow-lg shadow-amber-500/20 overflow-hidden group">
              <div className="bg-white rounded-[22px] overflow-hidden">
                <div className="p-3 bg-amber-50 border-b border-amber-100 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600 fill-amber-600" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-800">Акция дня</span>
                  </div>
                  <div className="flex gap-1">
                    <button 
                      onClick={() => setActivePromoIndex(prev => (prev - 1 + promoProducts.length) % promoProducts.length)}
                      className="p-1 hover:bg-amber-100 rounded-lg text-amber-600 transition-colors"
                    >
                      <ChevronLeft className="w-3 h-3" />
                    </button>
                    <button 
                      onClick={() => setActivePromoIndex(prev => (prev + 1) % promoProducts.length)}
                      className="p-1 hover:bg-amber-100 rounded-lg text-amber-600 transition-colors"
                    >
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div className="relative aspect-square cursor-pointer overflow-hidden" onClick={() => setSelectedProductDetail(promoProducts[activePromoIndex])}>
                  {promoProducts[activePromoIndex].images?.[0] ? (
                    <img 
                      src={promoProducts[activePromoIndex].images[0]} 
                      alt={promoProducts[activePromoIndex].name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-50 flex items-center justify-center">
                      <ImageIcon className="w-8 h-8 text-gray-200" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm">
                    -{Math.round(Math.random() * 20 + 10)}%
                  </div>
                </div>

                <div className="p-4 space-y-2">
                  <h4 className="font-bold text-xs text-gray-900 line-clamp-1">{promoProducts[activePromoIndex].name}</h4>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-col">
                      <span className="text-[14px] font-black text-gray-900">
                        {getProductRetailPrice(promoProducts[activePromoIndex]).toLocaleString()} ₽
                      </span>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        addToCart(promoProducts[activePromoIndex]);
                      }}
                      className="p-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow-md shadow-amber-500/20 transition-all active:scale-90"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-5">
            <div className="space-y-1">
              <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wider">Поиск по каталогу</h3>
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Название или артикул..."
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-0 focus:bg-white focus:ring-2 focus:ring-blue-500 rounded-xl text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wider mb-2">Разделы товаров</h3>
              <div className="flex flex-wrap md:flex-col gap-1.5">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => {
                      setSelectedCategory(cat);
                      setSelectedBrands([]); // Сброс брендов при смене категории
                    }}
                    className={`px-4 py-2.5 rounded-xl text-left font-bold text-xs transition-all flex items-center justify-between gap-2 whitespace-nowrap md:whitespace-normal w-full border ${
                      selectedCategory === cat
                        ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/10"
                        : "bg-white text-gray-600 hover:text-gray-900 hover:bg-gray-50 border-gray-100"
                    }`}
                  >
                    <span>{cat}</span>
                    <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${
                      selectedCategory === cat ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
                    }`}>
                      {products.filter(p => p.category === cat).length}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-gray-50">
              <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wider mb-2">Цена</h3>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={priceRange.min}
                  onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value }))}
                  placeholder="От"
                  className="w-full px-3 py-2 bg-gray-50 border-0 focus:bg-white focus:ring-2 focus:ring-blue-500 rounded-xl text-[10px] font-bold"
                />
                <span className="text-gray-300">—</span>
                <input
                  type="number"
                  value={priceRange.max}
                  onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
                  placeholder="До"
                  className="w-full px-3 py-2 bg-gray-50 border-0 focus:bg-white focus:ring-2 focus:ring-blue-500 rounded-xl text-[10px] font-bold"
                />
              </div>
            </div>

            {availableBrands.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-gray-50">
                <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wider mb-2">Бренды</h3>
                <div className="flex flex-wrap gap-1.5">
                  {availableBrands.map(brand => {
                    const isSelected = selectedBrands.includes(brand);
                    return (
                      <button
                        key={brand}
                        onClick={() => {
                          setSelectedBrands(prev => 
                            isSelected ? prev.filter(b => b !== brand) : [...prev, brand]
                          );
                        }}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${
                          isSelected
                            ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                            : "bg-white text-gray-500 border-gray-100 hover:border-gray-200"
                        }`}
                      >
                        {brand}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            
            {(selectedBrands.length > 0 || priceRange.min || priceRange.max || search) && (
              <button
                onClick={() => {
                  setSelectedBrands([]);
                  setPriceRange({ min: "", max: "" });
                  setSearch("");
                }}
                className="w-full py-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-red-500 transition-colors pt-2 border-t border-gray-50"
              >
                Сбросить фильтры
              </button>
            )}
          </div>
        </aside>

        {/* Right Side: Products Grid & Welcome Text */}
        <section className="flex-1 space-y-8">
          {displayWelcome && (
            <div className="bg-blue-50/50 border border-blue-100/50 p-6 rounded-3xl text-sm text-blue-900 leading-relaxed space-y-2">
              <div className="font-black flex items-center gap-1.5 uppercase text-xs tracking-wider text-blue-800">
                <Sparkles className="w-4 h-4 text-blue-500 fill-blue-500" /> Вводная информация
              </div>
              <p>{displayWelcome}</p>
            </div>
          )}

          {/* Grid Container */}
          <div>
            <div className="flex items-center justify-between gap-4 mb-6">
              <h3 className="text-xl font-black text-gray-900 tracking-tight">
                {selectedCategory || "Все товары"}
                <span className="text-sm text-gray-400 font-medium ml-2">({filteredProducts.length} позиций)</span>
              </h3>
            </div>

            {filteredProducts.length === 0 ? (
              <div className="bg-white p-16 rounded-3xl border border-gray-100 shadow-sm text-center">
                <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-4 text-gray-300">
                  <Search className="w-8 h-8" />
                </div>
                <h4 className="font-bold text-gray-800 mb-1">Ничего не найдено</h4>
                <p className="text-sm text-gray-400">Попробуйте изменить поисковый запрос или выбрать другой раздел</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
                {filteredProducts.map((product) => {
                  const displayImage = product.images?.[0] || product.image;
                  const itemPrice = getProductRetailPrice(product);
                  const isBlocked = product.saleBlocked;
                  const cartItem = cart[product.id];

                  return (
                    <div
                      key={product.id}
                      className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col relative"
                    >
                      {/* Image Frame */}
                      <div
                        onClick={() => setSelectedProductDetail(product)}
                        className="relative h-48 bg-gray-50 flex items-center justify-center cursor-pointer overflow-hidden select-none"
                      >
                        {displayImage ? (
                          <img
                            src={displayImage}
                            alt={product.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-gray-400">
                            <ImageIcon className="w-10 h-10 text-gray-200 mb-2" />
                            <span className="text-[9px] uppercase font-black tracking-wider text-gray-300">Нет фото</span>
                          </div>
                        )}

                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="px-3.5 py-1.5 bg-white/95 backdrop-blur font-bold text-xs text-blue-600 rounded-xl shadow-md flex items-center gap-1.5">
                            <Eye className="w-4 h-4" /> Смотреть детали
                          </span>
                        </div>
                      </div>

                      {/* Info block */}
                      <div className="p-5 flex-1 flex flex-col">
                        <div className="flex-1 space-y-2">
                          <div className="flex justify-between items-start gap-2">
                            <h4 className="font-bold text-sm text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug">
                              {product.name}
                            </h4>
                          </div>
                          {product.article && (
                            <span className="inline-block px-1.5 py-0.5 bg-gray-100 border border-gray-200 text-gray-500 text-[10px] font-bold rounded">
                              Арт: {product.article}
                            </span>
                          )}
                          {product.description && (
                            <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                              {product.description}
                            </p>
                          )}
                          
                          {/* Dimensions & specific metadata */}
                          {product.category === "Кухонные модули" && (product.moduleHeight || product.moduleWidth) && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {product.moduleHeight && (
                                <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-bold rounded">
                                  {product.moduleWidth}x{product.moduleHeight}x{product.moduleDepth} мм
                                </span>
                              )}
                              {product.moduleGroup && (
                                <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded">
                                  {product.moduleGroup}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Card Footer pricing and buy button */}
                        <div className="mt-5 pt-4 border-t border-gray-50 flex items-center justify-between gap-2">
                          <div className="flex flex-col">
                            <span className="text-[10px] uppercase font-black text-gray-400 tracking-wider">Розничная цена</span>
                            <span className="text-lg font-black text-gray-900">{itemPrice.toLocaleString()} ₽</span>
                          </div>

                          {isBlocked ? (
                            <span className="text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-100">Заблокировано</span>
                          ) : cartItem ? (
                            <div className="flex items-center bg-blue-50 rounded-xl p-1 border border-blue-100">
                              <button
                                onClick={() => removeFromCart(product.id)}
                                className="p-1 text-blue-600 hover:bg-blue-100 rounded-lg transition-all"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="px-2.5 font-bold text-sm text-blue-700">{cartItem.qty}</span>
                              <button
                                onClick={() => addToCart(product)}
                                className="p-1 text-blue-600 hover:bg-blue-100 rounded-lg transition-all"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => addToCart(product)}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-500/10 transition-all hover:-translate-y-0.5 active:scale-95"
                            >
                              В корзину
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Floating Checkout Button (Bottom Panel) */}
      {totalCartCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-gray-900/90 backdrop-blur text-white px-6 py-4 rounded-3xl shadow-2xl flex items-center gap-6 max-w-lg w-[calc(100%-2rem)] animate-in slide-in-from-bottom-8">
          <div className="flex flex-col select-none">
            <span className="text-[9px] uppercase font-black text-gray-400 tracking-wider">Ваша корзина</span>
            <span className="text-base font-black">
              {totalCartCount} шт. • {totalCartPrice.toLocaleString()} ₽
            </span>
          </div>
          <button
            onClick={() => setIsCartOpen(true)}
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg shadow-blue-600/30 transition-all active:scale-95 text-center text-sm"
          >
            Оформить заказ
          </button>
        </div>
      )}

      {/* Footer information */}
      <footer className="bg-gray-900 text-gray-400 py-12 mt-16 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-white">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-black text-lg">
                {company.name ? company.name[0].toUpperCase() : "C"}
              </div>
              <span className="font-black text-lg tracking-tight">{company.name}</span>
            </div>
            <p className="text-xs leading-relaxed text-gray-500">
              Цены указаны с учетом рекомендованных розничных коэффициентов компании. Оформление заявки не является публичной офертой и служит для формирования предварительного запроса цен и согласования спецификации.
            </p>
          </div>

          <div className="space-y-4">
            <h4 className="font-bold text-white text-sm uppercase tracking-wider">Контакты</h4>
            <div className="space-y-2.5 text-xs text-gray-400">
              {landing.phone && <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-blue-500" /> {landing.phone}</div>}
              {landing.email && <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-blue-500" /> {landing.email}</div>}
              {landing.address && <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-blue-500" /> {landing.address}</div>}
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-bold text-white text-sm uppercase tracking-wider">Быстрый заказ</h4>
            <p className="text-xs leading-relaxed text-gray-500">
              Вы можете добавить нужные кухонные или другие мебельные модули в корзину и отправить заявку. Мы сразу же свяжемся с вами для составления проекта.
            </p>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 pt-8 border-t border-gray-800 text-center text-xs text-gray-600">
          © {new Date().getFullYear()} {company.name}. Все права защищены.
        </div>
      </footer>

      {/* Cart Center Modal */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm select-none p-4">
          <div 
            className="absolute inset-0" 
            onClick={() => setIsCartOpen(false)} 
          />
          
          <div className="relative w-full max-w-4xl bg-white h-full max-h-[90vh] md:h-auto rounded-[32px] shadow-2xl flex flex-col md:flex-row overflow-hidden animate-in zoom-in-95 duration-300">
            {/* Header for Mobile */}
            <div className="md:hidden p-5 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-gray-900">Ваша корзина</h3>
              </div>
              <button onClick={() => setIsCartOpen(false)} className="p-1 text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Left: Cart Items List */}
            <div className="flex-[1.5] flex flex-col min-h-0 bg-white">
              <div className="hidden md:flex p-6 border-b border-gray-100 items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                    <ShoppingCart className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-gray-900 text-xl tracking-tight">Корзина заказа</h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Всего товаров: {totalCartCount}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsCartOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {Object.keys(cart).length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 space-y-4 py-12">
                    <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center">
                      <ShoppingCart className="w-10 h-10 text-gray-200" />
                    </div>
                    <div className="font-bold text-lg text-gray-900">Ваша корзина пуста</div>
                    <p className="text-sm text-gray-400 max-w-xs leading-relaxed">Выберите понравившиеся модули и комплектующие в каталоге, чтобы отправить запрос на расчет.</p>
                  </div>
                ) : (
                  Object.entries(cart).map(([cartKey, item]: [string, any]) => {
                    const product = item.product;
                    // Find required products details
                    const subProducts = (product.requiredProducts || []).map((rp: any) => {
                      const sp = products.find((p: any) => String(p.id) === String(rp.id));
                      return sp ? { ...sp, qty: rp.qty } : null;
                    }).filter(Boolean);

                    return (
                      <div 
                        key={cartKey} 
                        className="flex flex-col gap-4 p-5 bg-gray-50/50 rounded-[24px] border border-gray-100 relative group transition-all hover:bg-white hover:shadow-xl hover:shadow-blue-500/5 hover:border-blue-100"
                      >
                        <div className="flex gap-4">
                          <div className="w-20 h-20 bg-white rounded-2xl overflow-hidden border border-gray-200 flex-shrink-0 flex items-center justify-center shadow-sm">
                            {(product.images?.[0] || product.image) ? (
                              <img 
                                src={product.images?.[0] || product.image} 
                                alt={product.name} 
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <ImageIcon className="w-8 h-8 text-gray-200" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <h4 className="font-black text-sm text-gray-900 leading-tight mb-1">
                                  {product.name}
                                </h4>
                                {item.variationId && (
                                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-blue-50 text-blue-600 rounded-md text-[10px] font-black uppercase tracking-wider mb-1">
                                    Вариант: {product.variations?.find((v: any) => v.id === item.variationId)?.name || item.variationId}
                                  </div>
                                )}
                                <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider">{product.category}</p>
                              </div>
                              <button
                                onClick={() => deleteFromCart(cartKey)}
                                className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                title="Удалить из корзины"
                              >
                                <Trash2 className="w-4.5 h-4.5" />
                              </button>
                            </div>

                            <div className="flex items-center justify-between gap-2 mt-4">
                              <div className="flex flex-col">
                                <span className="text-lg font-black text-gray-900 leading-none">
                                  {(item.price * item.qty).toLocaleString()} ₽
                                </span>
                                <span className="text-[10px] text-gray-400 font-bold mt-1">
                                  {item.price.toLocaleString()} ₽ за ед.
                                </span>
                              </div>

                              <div className="flex items-center bg-white rounded-xl p-1 border border-gray-200 shadow-sm">
                                <button
                                  onClick={() => removeFromCart(product.id, item.variationId)}
                                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>
                                <span className="px-3 font-black text-sm text-gray-900">{item.qty}</span>
                                <button
                                  onClick={() => addToCart(product, item.variationId)}
                                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Sub-products (Required Items) */}
                        {subProducts.length > 0 && (
                          <div className="pt-4 border-t border-gray-100 space-y-2">
                            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2 flex items-center gap-2">
                              <Sparkles className="w-3 h-3 text-amber-500 fill-amber-500" />
                              В комплекте:
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {subProducts.map((sp: any, idx: number) => (
                                <div key={idx} className="flex items-center gap-2 bg-white/60 p-2 rounded-xl border border-gray-100">
                                  <div className="w-8 h-8 rounded-lg overflow-hidden bg-gray-50 flex-shrink-0">
                                    {(sp.images?.[0] || sp.image) ? (
                                      <img src={sp.images?.[0] || sp.image} className="w-full h-full object-cover" />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-gray-200"><ImageIcon className="w-3 h-3" /></div>
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-[10px] font-bold text-gray-800 truncate">{sp.name}</p>
                                    <p className="text-[9px] text-blue-600 font-black tracking-tight">{sp.qty} шт.</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right: Checkout Sidebar */}
            {Object.keys(cart).length > 0 && (
              <div className="flex-1 bg-gray-50 border-l border-gray-100 flex flex-col min-h-0">
                <div className="p-8 border-b border-gray-200/50 bg-white/50 backdrop-blur">
                  <h3 className="font-black text-gray-900 text-lg uppercase tracking-tight mb-6">Оформление заказа</h3>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center group">
                      <span className="text-sm font-bold text-gray-400 group-hover:text-gray-600 transition-colors">Сумма заказа:</span>
                      <span className="text-2xl font-black text-gray-900 tracking-tighter">{totalCartPrice.toLocaleString()} ₽</span>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100/50">
                      <p className="text-[10px] leading-relaxed text-blue-700 font-medium">
                        * Менеджер свяжется с вами для уточнения деталей проекта, согласования материалов и расчета стоимости доставки.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-8">
                  <form onSubmit={handleCheckoutSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <label className="block text-[11px] font-black uppercase text-gray-500 tracking-widest ml-1">Ваше Имя *</label>
                      <input
                        type="text"
                        required
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Как к вам обращаться?"
                        className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all shadow-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-[11px] font-black uppercase text-gray-500 tracking-widest ml-1">Контактный телефон *</label>
                      <input
                        type="tel"
                        required
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="+7 (___) ___-__-__"
                        className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all shadow-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-[11px] font-black uppercase text-gray-500 tracking-widest ml-1">Комментарий</label>
                      <textarea
                        rows={3}
                        value={customerComment}
                        onChange={(e) => setCustomerComment(e.target.value)}
                        placeholder="Напишите здесь свои пожелания или особенности заказа..."
                        className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all shadow-sm resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submittingOrder}
                      className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-[20px] shadow-xl shadow-blue-500/30 transition-all flex items-center justify-center gap-3 text-sm active:scale-95 disabled:opacity-50 group mt-4 uppercase tracking-widest"
                    >
                      {submittingOrder ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Обработка...
                        </>
                      ) : (
                        <>
                          Отправить заявку
                          <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </button>
                    <p className="text-[10px] text-center text-gray-400 font-medium px-4">
                      Нажимая кнопку, вы соглашаетесь с условиями обработки персональных данных
                    </p>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Product Detail Modal */}
      {selectedProductDetail && (() => {
        const product = selectedProductDetail;
        const displayImage = product.images?.[0] || product.image;
        const itemPrice = getProductRetailPrice(product, selectedVariationId);
        
        const cartKey = selectedVariationId ? `${product.id}_${selectedVariationId}` : product.id;
        const inCartItem = cart[cartKey];
        
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs select-none">
            <div className="absolute inset-0" onClick={() => {
              setSelectedProductDetail(null);
              setSelectedVariationId(null);
            }} />
            
            <div className="relative w-full max-w-2xl bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[90vh] md:max-h-none animate-in scale-in duration-300">
              
              {/* Left Column: Image Frame */}
              <div className="w-full md:w-1/2 bg-gray-50 flex items-center justify-center relative min-h-[250px] md:min-h-none">
                {displayImage ? (
                  <img
                    src={displayImage}
                    alt={product.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover absolute inset-0"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-gray-400">
                    <ImageIcon className="w-12 h-12 text-gray-200 mb-2" />
                    <span className="text-xs uppercase font-black text-gray-300 tracking-wider">Нет фото</span>
                  </div>
                )}
                
                {/* Category Badge */}
                <span className="absolute top-4 left-4 px-2.5 py-1 bg-white/95 backdrop-blur font-bold text-[10px] uppercase tracking-wider text-blue-600 rounded-lg shadow-sm">
                  {product.category}
                </span>
              </div>

              {/* Right Column: Info and Buying panel */}
              <div className="w-full md:w-1/2 p-6 flex flex-col justify-between overflow-y-auto">
                <div>
                  <div className="flex justify-between items-start gap-4 mb-4">
                    <h3 className="font-bold text-gray-950 text-lg md:text-xl leading-snug">{product.name}</h3>
                    <button 
                      onClick={() => {
                        setSelectedProductDetail(null);
                        setSelectedVariationId(null);
                      }}
                      className="p-1 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-gray-900 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-4 pr-1">
                    {product.article && (
                      <span className="inline-block px-2 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded">
                        Арт: {product.article}
                      </span>
                    )}

                    {product.description && (
                      <div>
                        <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Описание</h5>
                        <p className="text-xs text-gray-600 leading-relaxed">{product.description}</p>
                      </div>
                    )}

                    {/* Variations Selection */}
                    {product.variations && product.variations.length > 0 && (
                      <div className="space-y-2">
                        <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">Выберите вариант / размер</h5>
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => setSelectedVariationId(null)}
                            className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                              selectedVariationId === null 
                                ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-200" 
                                : "bg-white border-gray-200 text-gray-600 hover:border-blue-300"
                            }`}
                          >
                            Стандарт
                          </button>
                          {product.variations.map((v: any) => (
                            <button
                              key={v.id}
                              onClick={() => setSelectedVariationId(v.id)}
                              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                                selectedVariationId === v.id 
                                  ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-200" 
                                  : "bg-white border-gray-200 text-gray-600 hover:border-blue-300"
                              }`}
                            >
                              {v.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Specifications lists */}
                    <div className="space-y-2 pt-2">
                      <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">Технические характеристики</h5>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        {product.brand && (
                          <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                            <span className="text-[10px] text-gray-400 block mb-0.5">Бренд</span>
                            <span className="font-bold text-gray-800">{product.brand}</span>
                          </div>
                        )}
                        {product.moduleWidth && (
                          <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                            <span className="text-[10px] text-gray-400 block mb-0.5">Габариты</span>
                            <span className="font-bold text-gray-800">
                              {product.moduleWidth}х{product.moduleHeight || "-"}х{product.moduleDepth || "-"} мм
                            </span>
                          </div>
                        )}
                        {product.color && (
                          <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                            <span className="text-[10px] text-gray-400 block mb-0.5">Цвет / Декор</span>
                            <span className="font-bold text-gray-800">{product.color}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Companion products set details! */}
                    {product.requiredProducts && product.requiredProducts.length > 0 && (
                      <div className="p-3 bg-blue-50/50 rounded-2xl border border-blue-100/30">
                        <span className="text-[10px] font-black uppercase text-blue-700 tracking-wider flex items-center gap-1.5 mb-2 leading-none">
                          <Check className="w-3 h-3 text-blue-600" /> В комплект по умолчанию входят:
                        </span>
                        <div className="space-y-1">
                          {product.requiredProducts.map((rp: any, idx: number) => {
                            const cp = products.find((item: any) => String(item.id) === String(rp.id));
                            return (
                              <div key={idx} className="flex justify-between text-xs text-gray-600 leading-normal">
                                <span>• {cp?.name || "Товар"}</span>
                                <span className="font-extrabold text-blue-600 ml-2">{rp.qty} шт.</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Buying section in detailed modal */}
                <div className="mt-8 pt-4 border-t border-gray-100 flex items-center justify-between gap-4">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-black text-gray-400 tracking-wider">Розничная цена</span>
                    <span className="text-xl font-black text-gray-950">{itemPrice.toLocaleString()} ₽</span>
                  </div>

                  {product.saleBlocked ? (
                    <span className="px-4 py-2 bg-amber-50 text-amber-600 border border-amber-100 rounded-xl font-bold text-sm">Продажа временно закрыта</span>
                  ) : inCartItem ? (
                    <div className="flex items-center bg-blue-50 rounded-2xl p-1 border border-blue-100">
                      <button
                        onClick={() => removeFromCart(product.id, selectedVariationId)}
                        className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-xl transition-all"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="px-3.5 font-bold text-sm text-blue-700">{inCartItem.qty}</span>
                      <button
                        onClick={() => addToCart(product, selectedVariationId)}
                        className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-xl transition-all"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => addToCart(product, selectedVariationId)}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl text-xs shadow-lg shadow-blue-500/10 transition-all hover:-translate-y-0.5"
                    >
                      Добавить в корзину
                    </button>
                  )}
                </div>

              </div>
            </div>
          </div>
        );
      })()}

      {/* Success Order Dialog */}
      {orderSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs select-none">
          <div className="bg-white p-8 rounded-[32px] shadow-2xl max-w-sm text-center border border-gray-100 animate-in scale-in duration-300">
            <div className="w-16 h-16 rounded-3xl bg-green-50 text-green-600 flex items-center justify-center mx-auto mb-6">
              <Check className="w-8 h-8" strokeWidth={3} />
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-2">Заявка успешно создана!</h3>
            <p className="text-xs text-gray-500 leading-relaxed mb-6">
              Ваш заказ зарегистрирован в нашей системе под номером <span className="font-extrabold text-blue-600">#{orderSuccess.split("_")[1]}</span>. Дизайнеры и менеджеры {company.name} свяжутся с вами в ближайшее время по указанному номеру телефона для уточнения деталей. Спасибо за выбор нашей компании!
            </p>
            <button
              onClick={() => setOrderSuccess(null)}
              className="w-full py-3 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-2xl transition-colors"
            >
              Отлично
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

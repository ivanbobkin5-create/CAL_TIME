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
        localStorage.setItem(cacheKey, JSON.stringify(data));
        
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
  const getProductRetailPrice = (product: any): number => {
    const coeff = getProductCoefficient(product);
    const basePrice = product.purchasePrice !== undefined ? product.purchasePrice : (product.price || 0);
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
    return Array.from(new Set(products.map(p => p.category))) as string[];
  }, [products]);

  const availableBrands = useMemo(() => {
    const brands = products
      .filter(p => !selectedCategory || p.category === selectedCategory)
      .map(p => p.brand)
      .filter(Boolean);
    return Array.from(new Set(brands)) as string[];
  }, [products, selectedCategory]);

  // Filter products matching category, search, brands and price
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesCategory = !selectedCategory || p.category === selectedCategory;
      
      const searchLower = search.toLowerCase();
      const matchesSearch = !search || 
        p.name.toLowerCase().includes(searchLower) || 
        (p.article && p.article.toLowerCase().includes(searchLower)) ||
        (p.description && p.description.toLowerCase().includes(searchLower));
        
      const matchesBrand = selectedBrands.length === 0 || selectedBrands.includes(p.brand);
      
      const retailPrice = getProductRetailPrice(p);
      const matchesMinPrice = !priceRange.min || retailPrice >= parseFloat(priceRange.min);
      const matchesMaxPrice = !priceRange.max || retailPrice <= parseFloat(priceRange.max);

      return matchesCategory && matchesSearch && matchesBrand && matchesMinPrice && matchesMaxPrice;
    });
  }, [products, selectedCategory, search, selectedBrands, priceRange, getProductRetailPrice]);

  // Cart operations
  const addToCart = (product: any) => {
    const price = getProductRetailPrice(product);
    setCart(prev => {
      const existing = prev[product.id];
      return {
        ...prev,
        [product.id]: {
          product,
          qty: (existing?.qty || 0) + 1,
          price
        }
      };
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => {
      const existing = prev[productId];
      if (!existing) return prev;
      
      const next = { ...prev };
      if (existing.qty <= 1) {
        delete next[productId];
      } else {
        next[productId] = {
          ...existing,
          qty: existing.qty - 1
        };
      }
      return next;
    });
  };

  const deleteFromCart = (productId: string) => {
    setCart(prev => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
  };

  const updateCartQty = (productId: string, val: number) => {
    if (val <= 0) {
      deleteFromCart(productId);
      return;
    }
    setCart(prev => {
      const existing = prev[productId];
      if (!existing) return prev;
      return {
        ...prev,
        [productId]: {
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
      const cartItems = Object.values(cart).map(item => ({
        id: item.product.id,
        name: item.product.name,
        article: item.product.article || "",
        category: item.product.category,
        quantity: item.qty,
        price: item.price,
        purchasePrice: item.product.purchasePrice || item.product.price || 0,
        brand: item.product.brand || "",
        images: item.product.images || []
      }));

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

      {/* Cart Drawer Modal */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs select-none">
          <div 
            className="absolute inset-0" 
            onClick={() => setIsCartOpen(false)} 
          />
          
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-gray-900 text-lg">Корзина заказа</h3>
              </div>
              <button 
                onClick={() => setIsCartOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-900 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {Object.keys(cart).length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 space-y-3">
                  <ShoppingCart className="w-12 h-12 text-gray-200" />
                  <div className="font-bold">Ваша корзина пуста</div>
                  <p className="text-xs text-gray-400 max-w-xs leading-relaxed">Выберите понравившиеся товары из каталога и добавьте их в корзину для оформления расчета.</p>
                </div>
              ) : (
                Object.values(cart).map(item => (
                  <div 
                    key={item.product.id} 
                    className="flex gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100 relative group"
                  >
                    <div className="w-14 h-14 bg-white rounded-xl overflow-hidden border border-gray-200 flex-shrink-0 flex items-center justify-center">
                      {(item.product.images?.[0] || item.product.image) ? (
                        <img 
                          src={item.product.images?.[0] || item.product.image} 
                          alt={item.product.name} 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="w-6 h-6 text-gray-200" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <h4 className="font-bold text-xs text-gray-900 truncate pr-6" title={item.product.name}>
                        {item.product.name}
                      </h4>
                      <p className="text-[10px] text-gray-400 font-bold">{item.product.category}</p>
                      
                      <div className="flex items-center justify-between gap-2 mt-2">
                        <span className="text-sm font-black text-gray-900">
                          {item.price.toLocaleString()} ₽ <span className="text-[9px] text-gray-400 font-medium">/ шт.</span>
                        </span>

                        <div className="flex items-center bg-white rounded-xl p-0.5 border border-gray-200">
                          <button
                            onClick={() => removeFromCart(item.product.id)}
                            className="p-1 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition-all"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="px-2 font-bold text-xs text-gray-700">{item.qty}</span>
                          <button
                            onClick={() => addToCart(item.product)}
                            className="p-1 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition-all"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => deleteFromCart(item.product.id)}
                      className="absolute top-2 right-2 p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all rounded-lg"
                      title="Удалить из корзины"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Summary and Order Form */}
            {Object.keys(cart).length > 0 && (
              <div className="p-5 border-t border-gray-100 bg-gray-50 space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-bold text-gray-500">Предварительный итог:</span>
                  <span className="text-xl font-black text-gray-900">{totalCartPrice.toLocaleString()} ₽</span>
                </div>

                <form onSubmit={handleCheckoutSubmit} className="space-y-3 pt-3 border-t border-gray-200">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider">ФИО *</label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Иван Иванов"
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider">Телефон *</label>
                    <input
                      type="tel"
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="+7 (999) 123-45-67"
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider">Email (необязательно)</label>
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="client@mail.ru"
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider">Комментарии к заказу</label>
                    <textarea
                      rows={2}
                      value={customerComment}
                      onChange={(e) => setCustomerComment(e.target.value)}
                      placeholder="Нужна доставка и сборка, а также правый глухой угол..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs focus:ring-1 focus:ring-blue-500 resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submittingOrder}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 text-xs active:scale-95 disabled:opacity-55"
                  >
                    {submittingOrder ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Отправка заявки...
                      </>
                    ) : (
                      <>
                        Отправить запрос на расчет
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Product Detail Modal */}
      {selectedProductDetail && (() => {
        const product = selectedProductDetail;
        const displayImage = product.images?.[0] || product.image;
        const itemPrice = getProductRetailPrice(product);
        const inCartItem = cart[product.id];
        
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs select-none">
            <div className="absolute inset-0" onClick={() => setSelectedProductDetail(null)} />
            
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
              <div className="w-full md:w-1/2 p-6 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start gap-4 mb-4">
                    <h3 className="font-bold text-gray-950 text-lg md:text-xl leading-snug">{product.name}</h3>
                    <button 
                      onClick={() => setSelectedProductDetail(null)}
                      className="p-1 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-gray-900 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
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
                        onClick={() => removeFromCart(product.id)}
                        className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-xl transition-all"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="px-3.5 font-bold text-sm text-blue-700">{inCartItem.qty}</span>
                      <button
                        onClick={() => addToCart(product)}
                        className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-xl transition-all"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => addToCart(product)}
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

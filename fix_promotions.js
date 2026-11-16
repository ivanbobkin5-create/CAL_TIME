const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Pass promotions to ProductsView
let pvSig = `const ProductsView = ({
  onAddProduct,
  catalogProducts,
  productCategories,
  setProductCategories,
  coefficients,
  globalCoefficients,
  productionFormat,
  onSaveProduct,
  onDeleteProduct,
  userRole,
  companyType,
  furnitureType,
  setFurnitureType,
  checklistRefused,`;

code = code.replace(pvSig, pvSig + `
  promotions,`);

let pvProps = `  companyType: string | undefined;
  furnitureType: "cabinet" | "upholstered";
  setFurnitureType: (type: "cabinet" | "upholstered") => void;
  checklistRefused: boolean;`;

code = code.replace(pvProps, pvProps + `
  promotions?: any[];`);

// Pass promotions when calling ProductsView
let pvCall = `<ProductsView
              catalogProducts={catalogProducts}
              productCategories={productCategories}
              setProductCategories={setProductCategories}
              coefficients={coefficients}
              globalCoefficients={globalCoefficients}
              productionFormat={productionFormat}
              onSaveProduct={saveProduct}
              onDeleteProduct={deleteProduct}
              userRole={userRole}
              companyType={companyData?.type}
              furnitureType={companyData?.production?.furnitureType || "cabinet"}
              setFurnitureType={setFurnitureType}
              checklistRefused={companyData?.production?.checklistRefused || false}`;

code = code.replace(pvCall, pvCall + `
              promotions={promotions}`);


// 2. Add "Акционные товары" logic to ProductsView filtering
let pvFilter = `    return catalogProducts.filter((p) => {
      if (
        selectedCategory &&
        p.category !== selectedCategory &&
        selectedCategory !== "Все категории"
      ) {
        return false;
      }`;

let pvFilterNew = `    return catalogProducts.filter((p) => {
      if (selectedCategory === "Акционные товары") {
        let isPromo = false;
        if (promotions && Array.isArray(promotions)) {
          for (const promo of promotions) {
            if (promo.isActive === false) continue;
            if (promo.promoType === 'discount' && promo.discountScopes?.includes('specific_products') && promo.targetProductIds?.includes(String(p.id))) isPromo = true;
            if (promo.promoType === 'cashback' && promo.cashbackScopes?.includes('specific_products') && promo.targetProductIds?.includes(String(p.id))) isPromo = true;
          }
        }
        if (!isPromo) return false;
      } else if (
        selectedCategory &&
        p.category !== selectedCategory &&
        selectedCategory !== "Все категории"
      ) {
        return false;
      }`;

code = code.replace(pvFilter, pvFilterNew);


// 3. Add "Акционные товары" button to ProductsView
let pvCatBtns = `        <button
          onClick={() => setSelectedCategory(null)}
          className={cn(
            "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
            !selectedCategory
              ? "bg-blue-600 text-white shadow-md shadow-blue-100"
              : "bg-white text-gray-600 border border-gray-200 hover:border-blue-300",
          )}
        >
          Все категории
        </button>`;

let pvCatBtnsNew = pvCatBtns + `
        {(() => {
          let hasPromos = false;
          if (promotions && Array.isArray(promotions)) {
            for (const promo of promotions) {
              if (promo.isActive === false) continue;
              if (promo.promoType === 'discount' && promo.discountScopes?.includes('specific_products') && promo.targetProductIds?.length > 0) hasPromos = true;
              if (promo.promoType === 'cashback' && promo.cashbackScopes?.includes('specific_products') && promo.targetProductIds?.length > 0) hasPromos = true;
            }
          }
          if (!hasPromos) return null;
          return (
            <button
              onClick={() => setSelectedCategory("Акционные товары")}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all flex items-center gap-1.5",
                selectedCategory === "Акционные товары"
                  ? "bg-rose-600 text-white shadow-md shadow-rose-200"
                  : "bg-rose-50 text-rose-600 border border-rose-200 hover:border-rose-300 hover:bg-rose-100",
              )}
            >
              <Percent className="w-3.5 h-3.5" /> Акционные товары
            </button>
          );
        })()}`;

code = code.replace(pvCatBtns, pvCatBtnsNew);

// 4. Pass promotions to ReadyMadeProductsView
let rvSig = `const ReadyMadeProductsView = ({
  catalogProducts,
  onAddProduct,
  selectedCategory,
  setSelectedCategory,
  companyData,
  customerType,
  resolveBrandCoefficient,
  setSelectedProductForDetail,
  showAlert,
  showPrompt,
  showConfirm,
  setActiveTab,
}: {
  catalogProducts: any[];
  onAddProduct: (product: any, qty: number) => void;
  selectedCategory: string | null;
  setSelectedCategory: (cat: string | null) => void;
  companyData: any;
  customerType: string;
  resolveBrandCoefficient: (cat: string, brand: string) => number;
  setSelectedProductForDetail: (p: any) => void;
  showAlert: (title: string, message: string) => void;
  showPrompt: any;
  showConfirm: any;
  setActiveTab?: (tab: string) => void;
}) => {`;

code = code.replace(rvSig, rvSig.replace('setActiveTab?: (tab: string) => void;', 'setActiveTab?: (tab: string) => void;\n  promotions?: any[];').replace('  setActiveTab,', '  setActiveTab,\n  promotions,'));

let rvCall = `<ReadyMadeProductsView
              catalogProducts={catalogProducts}
              onAddProduct={onAddProduct}
              selectedCategory={selectedReadyMadeCategory}
              setSelectedCategory={setSelectedReadyMadeCategory}
              companyData={companyData}
              customerType={customerType}
              resolveBrandCoefficient={resolveBrandCoefficient}
              setSelectedProductForDetail={setSelectedProductForDetail}
              showAlert={showAlert}
              showPrompt={showPrompt}
              showConfirm={showConfirm}
              setActiveTab={(tab: string) => setActiveTab(tab as any)}
            />`;

code = code.replace(rvCall, rvCall.replace('/>', '  promotions={promotions}\n            />'));

// 5. Add "Акционные товары" logic to ReadyMadeProductsView filtering
let rvFilter = `      const matchesCategory = readyMadeCats.some((c: string) => catLower.includes(c.toLowerCase()) || c.toLowerCase().includes(catLower)) || (catLower.includes("кух") && !catLower.includes("модул")) || catLower.includes("кухон");
      if (!matchesCategory) return false;

      if (selectedCategory && selectedCategory.trim() !== "") {`;

let rvFilterNew = `      let isPromoProduct = false;
      if (promotions && Array.isArray(promotions)) {
        for (const promo of promotions) {
          if (promo.isActive === false) continue;
          if (promo.promoType === 'discount' && promo.discountScopes?.includes('specific_products') && promo.targetProductIds?.includes(String(p.id))) isPromoProduct = true;
          if (promo.promoType === 'cashback' && promo.cashbackScopes?.includes('specific_products') && promo.targetProductIds?.includes(String(p.id))) isPromoProduct = true;
        }
      }

      if (selectedCategory === "Акционные товары") {
        if (!isPromoProduct) return false;
      } else {
        const matchesCategory = readyMadeCats.some((c: string) => catLower.includes(c.toLowerCase()) || c.toLowerCase().includes(catLower)) || (catLower.includes("кух") && !catLower.includes("модул")) || catLower.includes("кухон");
        if (!matchesCategory && !isPromoProduct) return false;

        if (selectedCategory && selectedCategory.trim() !== "") {`;

code = code.replace(rvFilter, rvFilterNew);

// But wait, the filter logic for ReadyMadeProductsView has a closing brace to match!
let rvFilterClose = `        if (!matchesSel) {
          return false;
        }
      }`;

let rvFilterCloseNew = `        if (!matchesSel) {
          return false;
        }
      }
      }`;

code = code.replace(rvFilterClose, rvFilterCloseNew);


// 6. Add "Акционные товары" to the sidebar under Готовая Мебель
let sidebarReadyMade = `{(companyData?.readyMadeConfig?.categories || ["Кухни", "Шкафы", "Прихожие", "Столы", "Комоды"]).map((cat: string) => (`;
let sidebarReadyMadeNew = `
                          {(() => {
                            let hasPromos = false;
                            if (promotions && Array.isArray(promotions)) {
                              for (const promo of promotions) {
                                if (promo.isActive === false) continue;
                                if (promo.promoType === 'discount' && promo.discountScopes?.includes('specific_products') && promo.targetProductIds?.length > 0) hasPromos = true;
                                if (promo.promoType === 'cashback' && promo.cashbackScopes?.includes('specific_products') && promo.targetProductIds?.length > 0) hasPromos = true;
                              }
                            }
                            if (!hasPromos) return null;
                            return (
                              <button
                                onClick={() => {
                                  setActiveTab("ready_made");
                                  setSelectedReadyMadeCategory("Акционные товары");
                                }}
                                className={cn(
                                  "w-full text-left px-2 py-1 rounded-md text-xs font-medium transition-all truncate flex items-center justify-between",
                                  activeTab === "ready_made" && selectedReadyMadeCategory === "Акционные товары"
                                    ? "bg-rose-50 text-rose-700 font-bold"
                                    : "text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                                )}
                              >
                                <span>Акционные товары</span>
                                <Percent className="w-3 h-3" />
                              </button>
                            );
                          })()}
                          ` + sidebarReadyMade;

code = code.replace(sidebarReadyMade, sidebarReadyMadeNew);


// 7. Render Badges on cards
// For ReadyMadeProductsView:
let rvBadge = `<div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                    <span className="px-2.5 py-1 bg-white/90 backdrop-blur-md text-blue-700 text-[10px] font-bold rounded-lg shadow-sm border border-blue-100">
                      {product.category || "Готовая мебель"}
                    </span>`;

let rvBadgeNew = `<div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                    {(() => {
                      let activePromos = [];
                      if (promotions && Array.isArray(promotions)) {
                        for (const promo of promotions) {
                          if (promo.isActive === false) continue;
                          if (promo.promoType === 'discount' && promo.discountScopes?.includes('specific_products') && promo.targetProductIds?.includes(String(product.id))) activePromos.push(promo);
                          if (promo.promoType === 'cashback' && promo.cashbackScopes?.includes('specific_products') && promo.targetProductIds?.includes(String(product.id))) activePromos.push(promo);
                        }
                      }
                      if (activePromos.length > 0) {
                        return (
                          <span className="px-2.5 py-1 bg-gradient-to-r from-rose-500 to-pink-500 text-white text-[10px] font-bold rounded-lg shadow-sm flex items-center gap-1 shadow-rose-200">
                            <Percent className="w-3 h-3" /> АКЦИЯ
                          </span>
                        );
                      }
                      return null;
                    })()}
                    <span className="px-2.5 py-1 bg-white/90 backdrop-blur-md text-blue-700 text-[10px] font-bold rounded-lg shadow-sm border border-blue-100">
                      {product.category || "Готовая мебель"}
                    </span>`;

code = code.replace(rvBadge, rvBadgeNew);

// For ProductsView:
let pvBadge = `                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-semibold text-gray-900">{product.name}</span>
                      <span className="text-xs text-gray-500 truncate max-w-[200px]">`;

let pvBadgeNew = `                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">{product.name}</span>
                        {(() => {
                          let isPromo = false;
                          if (promotions && Array.isArray(promotions)) {
                            for (const promo of promotions) {
                              if (promo.isActive === false) continue;
                              if (promo.promoType === 'discount' && promo.discountScopes?.includes('specific_products') && promo.targetProductIds?.includes(String(product.id))) isPromo = true;
                              if (promo.promoType === 'cashback' && promo.cashbackScopes?.includes('specific_products') && promo.targetProductIds?.includes(String(product.id))) isPromo = true;
                            }
                          }
                          if (isPromo) {
                            return (
                              <span className="px-1.5 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-bold rounded flex items-center gap-0.5">
                                <Percent className="w-2.5 h-2.5" /> Акция
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </div>
                      <span className="text-xs text-gray-500 truncate max-w-[200px]">`;

code = code.replace(pvBadge, pvBadgeNew);

fs.writeFileSync('src/App.tsx', code, 'utf8');
console.log('Modifications applied.');

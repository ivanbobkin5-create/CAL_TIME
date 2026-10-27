const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target = `      const matchesCategory =
        !selectedCategory || p.category === selectedCategory;`;

const replacement = `      let isPromo = false;
      if (promotions && Array.isArray(promotions)) {
        for (const promo of promotions) {
          if (promo.isActive === false) continue;
          if (promo.promoType === 'discount' && promo.discountScopes?.includes('specific_products') && promo.targetProductIds?.includes(String(p.id || p.parentProductId))) isPromo = true;
          if (promo.promoType === 'cashback' && promo.cashbackScopes?.includes('specific_products') && promo.targetProductIds?.includes(String(p.id || p.parentProductId))) isPromo = true;
        }
      }

      const matchesCategory =
        !selectedCategory || 
        (selectedCategory === "Акционные товары" ? isPromo : p.category === selectedCategory);`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync('src/App.tsx', code, 'utf8');
  console.log('Replaced successfully');
} else {
  console.log('Target not found');
}

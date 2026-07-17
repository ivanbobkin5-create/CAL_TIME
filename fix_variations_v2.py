with open('src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

target = """                               .map((p) => {
                                 const displayName = p.name ? (p.name.length > 50 ? p.name.substring(0, 48) + "..." : p.name) : "";
                                 const displayPrice = p.purchasePrice
                                   ? Math.round(p.purchasePrice * getProductCoefficient(p, customerType, resolveBrandCoefficient))
                                   : p.price;
                                 return (
                                   <option key={p.id} value={p.id} title={p.name}>
                                     [{p.category}] {displayName} ({(displayPrice || 0).toLocaleString()} ₽) {p.article ? `| Арт: ${p.article}` : ""}
                                   </option>
                                 );
                               })"""

replacement = """                               .flatMap((p) => {
                                 if (p.variations && Array.isArray(p.variations) && p.variations.length > 0) {
                                     return p.variations.map((v: any, idx: number) => ({
                                         ...p,
                                         id: `${p.id}_var_${v.id || idx}`,
                                         name: `${p.name} (${v.name || v.id || idx})`,
                                         purchasePrice: v.purchasePrice || p.purchasePrice,
                                         article: v.article || p.article
                                     }));
                                 }
                                 return [p];
                               })
                               .map((p) => {
                                 const displayName = p.name ? (p.name.length > 50 ? p.name.substring(0, 48) + "..." : p.name) : "";
                                 const displayPrice = p.purchasePrice
                                   ? Math.round(p.purchasePrice * getProductCoefficient(p, customerType, resolveBrandCoefficient))
                                   : p.price;
                                 return (
                                   <option key={p.id} value={p.id} title={p.name}>
                                     [{p.category}] {displayName} ({(displayPrice || 0).toLocaleString()} ₽) {p.article ? `| Арт: ${p.article}` : ""}
                                   </option>
                                 );
                               })"""

if target in content:
    content = content.replace(target, replacement, 1)
    with open('src/App.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Variations added successfully")
else:
    # Try just replacing the .map part
    target_simple = ".map((p) => {"
    # This is dangerous if there are other maps
    print("Target not found. Try manual approach.")

with open('src/App.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if '.map((p) => {' in line and 'catalogProducts' in lines[i-1]: # To be safe
        lines[i] = line.replace('.map((p) => {', '.flatMap((p) => {\n                                 if (p.variations && Array.isArray(p.variations) && p.variations.length > 0) {\n                                     return p.variations.map((v: any, idx: number) => ({\n                                         ...p,\n                                         id: `${p.id}_var_${v.id || idx}`,\n                                         name: `${p.name} (${v.name || v.id || idx})`,\n                                         purchasePrice: v.purchasePrice || p.purchasePrice,\n                                         article: v.article || p.article\n                                     }));\n                                 }\n                                 return [p];\n                               })\n                               .map((p) => {')
        break

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.writelines(lines)
print("Variations added successfully")

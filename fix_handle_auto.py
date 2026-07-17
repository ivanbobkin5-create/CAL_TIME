
with open('src/App.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'matchedProd = inCat.find((p: any) => matchProductSegment(p, activeSegment)) || inCat[0];' in line:
        lines[i] = '        matchedProd = inCat.find((p: any) => matchProductSegment(p, activeSegment)) || inCat[0];\n'
        lines[i] += '        if (category === "Ручки и крючки" && matchedProd && matchedProd.variations) {\n'
        lines[i] += '            const v = matchedProd.variations.find((v: any) => v.name && String(v.name).includes("128"));\n'
        lines[i] += '            if (v) {\n'
        lines[i] += '                matchedProd = {\n'
        lines[i] += '                    ...matchedProd,\n'
        lines[i] += '                    id: `${matchedProd.id}_var_${v.id || 0}`,\n'
        lines[i] += '                    name: `${matchedProd.name} (${v.name})`,\n'
        lines[i] += '                    purchasePrice: v.purchasePrice || matchedProd.purchasePrice,\n'
        lines[i] += '                    article: v.article || matchedProd.article\n'
        lines[i] += '                };\n'
        lines[i] += '            }\n'
        lines[i] += '        }\n'
        break

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.writelines(lines)
print("Auto-handle 128mm logic added")

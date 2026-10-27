with open('src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

target = """    fastenerPlinthMaterialFilter,
    coefficients,"""

replacement = """    fastenerPlinthMaterialFilter,
    basketBrandFilter,
    basketRunnerTypeFilter,
    basketTypeFilter,
    basketColorFilter,
    basketWidthFilter,
    wtGroupFilter,
    wtTypeFilter,
    wtManufacturerFilter,
    wtLengthFilter,
    wtDepthFilter,
    wtThicknessFilter,
    wtEdgeFilter,
    coefficients,"""

if target in content:
    content = content.replace(target, replacement, 1)
    with open('src/App.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Dependencies added")
else:
    print("ERROR: Target dependencies not found")

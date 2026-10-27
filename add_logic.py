import os

with open('src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Добавление логики фильтрации
target_memo = """      let matchesWardrobeColor = true;
      if (selectedCategory === "Оснащение шкафов" && wardrobeColorFilter) {
        matchesWardrobeColor = (p.color || "") === wardrobeColorFilter;
      }"""

replacement_memo = """      let matchesWardrobeColor = true;
      if (selectedCategory === "Оснащение шкафов" && wardrobeColorFilter) {
        matchesWardrobeColor = (p.color || "") === wardrobeColorFilter;
      }

      let matchesBasketBrand = true;
      if (selectedCategory === "Выдвижные корзины" && basketBrandFilter) {
        matchesBasketBrand = (p.manufacturer || p.brand || "") === basketBrandFilter;
      }

      let matchesBasketRunnerType = true;
      if (selectedCategory === "Выдвижные корзины" && basketRunnerTypeFilter) {
        matchesBasketRunnerType = (p.basketRunnerType || "") === basketRunnerTypeFilter;
      }

      let matchesBasketType = true;
      if (selectedCategory === "Выдвижные корзины" && basketTypeFilter) {
        matchesBasketType = (p.basketType || "") === basketTypeFilter;
      }

      let matchesBasketColor = true;
      if (selectedCategory === "Выдвижные корзины" && basketColorFilter) {
        matchesBasketColor = (p.color || "") === basketColorFilter;
      }

      let matchesBasketWidth = true;
      if (selectedCategory === "Выдвижные корзины" && basketWidthFilter) {
        matchesBasketWidth = (p.basketWidth || "") === basketWidthFilter;
      }

      let matchesWtGroup = true;
      if (selectedCategory === "Столешницы и стеновые" && wtGroupFilter) {
        matchesWtGroup = (p.wtGroup || "") === wtGroupFilter;
      }

      let matchesWtType = true;
      if (selectedCategory === "Столешницы и стеновые" && wtTypeFilter) {
        matchesWtType = (p.wtType || "") === wtTypeFilter;
      }

      let matchesWtManufacturer = true;
      if (selectedCategory === "Столешницы и стеновые" && wtManufacturerFilter) {
        matchesWtManufacturer = (p.wtManufacturer || p.manufacturer || "") === wtManufacturerFilter;
      }

      let matchesWtLength = true;
      if (selectedCategory === "Столешницы и стеновые" && wtLengthFilter) {
        matchesWtLength = String(p.wtLength || "") === wtLengthFilter;
      }

      let matchesWtDepth = true;
      if (selectedCategory === "Столешницы и стеновые" && wtDepthFilter) {
        matchesWtDepth = String(p.wtDepth || "") === wtDepthFilter;
      }

      let matchesWtThickness = true;
      if (selectedCategory === "Столешницы и стеновые" && wtThicknessFilter) {
        matchesWtThickness = String(p.wtThickness || "") === wtThicknessFilter;
      }

      let matchesWtEdge = true;
      if (selectedCategory === "Столешницы и стеновые" && wtEdgeFilter) {
        matchesWtEdge = (p.wtEdge || "") === wtEdgeFilter;
      }"""

if target_memo in content:
    content = content.replace(target_memo, replacement_memo, 1)
    print("1. Filter logic added")
else:
    print("ERROR: Target memo not found")

# 2. Добавление возвращаемых значений
target_return = """        matchesWardrobeColor;"""

replacement_return = """        matchesWardrobeColor &&
        matchesBasketBrand &&
        matchesBasketRunnerType &&
        matchesBasketType &&
        matchesBasketColor &&
        matchesBasketWidth &&
        matchesWtGroup &&
        matchesWtType &&
        matchesWtManufacturer &&
        matchesWtLength &&
        matchesWtDepth &&
        matchesWtThickness &&
        matchesWtEdge;"""

if target_return in content:
    content = content.replace(target_return, replacement_return, 1)
    print("2. Return values added")
else:
    print("ERROR: Target return not found")

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

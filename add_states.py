import os

with open('src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Добавление стейтов для новых фильтров
target_states = """  const [dryerWidthFilter, setDryerWidthFilter] = useState<string | null>(null);
  const [dryerBaseFilter, setDryerBaseFilter] = useState<string | null>(null);"""

replacement_states = """  const [dryerWidthFilter, setDryerWidthFilter] = useState<string | null>(null);
  const [dryerBaseFilter, setDryerBaseFilter] = useState<string | null>(null);
  
  // Basket Filters
  const [basketBrandFilter, setBasketBrandFilter] = useState<string | null>(null);
  const [basketRunnerTypeFilter, setBasketRunnerTypeFilter] = useState<string | null>(null);
  const [basketTypeFilter, setBasketTypeFilter] = useState<string | null>(null);
  const [basketColorFilter, setBasketColorFilter] = useState<string | null>(null);
  const [basketWidthFilter, setBasketWidthFilter] = useState<string | null>(null);

  // Countertop/Wall Panel Filters
  const [wtGroupFilter, setWtGroupFilter] = useState<string | null>(null);
  const [wtTypeFilter, setWtTypeFilter] = useState<string | null>(null);
  const [wtManufacturerFilter, setWtManufacturerFilter] = useState<string | null>(null);
  const [wtLengthFilter, setWtLengthFilter] = useState<string | null>(null);
  const [wtDepthFilter, setWtDepthFilter] = useState<string | null>(null);
  const [wtThicknessFilter, setWtThicknessFilter] = useState<string | null>(null);
  const [wtEdgeFilter, setWtEdgeFilter] = useState<string | null>(null);"""

if target_states in content:
    content = content.replace(target_states, replacement_states, 1)
    print("1. States added")
else:
    print("ERROR: Target states not found")

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

with open('src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Catalog UI
target_cat_ui = """      {selectedCategory === "Оснащение шкафов" && ("""

replacement_cat_ui = """      {selectedCategory === "Выдвижные корзины" && (
        <div className="flex flex-wrap items-center gap-4 mb-6 p-4 bg-sky-50/50 rounded-2xl border border-sky-100 text-xs">
            <select value={basketBrandFilter || ""} onChange={(e) => setBasketBrandFilter(e.target.value || null)} className="px-2 py-1 border rounded">
                <option value="">Бренд</option>
                {["Boyard", "Ekotech", "Hafele", "Hettich", "Kalibra", "Китай"].map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            <select value={basketRunnerTypeFilter || ""} onChange={(e) => setBasketRunnerTypeFilter(e.target.value || null)} className="px-2 py-1 border rounded">
                <option value="">Тип направляющих</option>
                {["Скрытого монтажа", "Шариковые"].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
             <select value={basketTypeFilter || ""} onChange={(e) => setBasketTypeFilter(e.target.value || null)} className="px-2 py-1 border rounded">
                <option value="">Тип</option>
                {["Бутылочницы", "Бутылочницы в верхнюю базу", "Угловые механизмы", "Колонны", "Мусорные ведра и системы сортировки"].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={basketColorFilter || ""} onChange={(e) => setBasketColorFilter(e.target.value || null)} className="px-2 py-1 border rounded">
                <option value="">Цвет</option>
                {["антрацит", "графит", "серебристый", "серый", "хром"].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
             <select value={basketWidthFilter || ""} onChange={(e) => setBasketWidthFilter(e.target.value || null)} className="px-2 py-1 border rounded">
                <option value="">Ширина</option>
                {["150 мм", "200 мм", "300 мм", "400 мм", "450 мм", "500 мм", "600 мм", "700 мм", "800 мм", "900 мм"].map(w => <option key={w} value={w}>{w}</option>)}
            </select>
        </div>
      )}
      {selectedCategory === "Столешницы и стеновые" && (
        <div className="flex flex-wrap items-center gap-4 mb-6 p-4 bg-sky-50/50 rounded-2xl border border-sky-100 text-xs">
            <select value={wtGroupFilter || ""} onChange={(e) => setWtGroupFilter(e.target.value || null)} className="px-2 py-1 border rounded">
                <option value="">Группа</option>
                {["Столешница", "Стеновая панель"].map(g => <option key={g} value={g}>{g}</option>)}
            </select>
             <select value={wtTypeFilter || ""} onChange={(e) => setWtTypeFilter(e.target.value || null)} className="px-2 py-1 border rounded">
                <option value="">Тип</option>
                {["ЛДСП", "МДФ", "Компакт-ламинат"].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input placeholder="Бренд" value={wtManufacturerFilter || ""} onChange={(e) => setWtManufacturerFilter(e.target.value || null)} className="px-2 py-1 border rounded" />
            <input placeholder="Длина" value={wtLengthFilter || ""} onChange={(e) => setWtLengthFilter(e.target.value || null)} className="px-2 py-1 border rounded" />
            <input placeholder="Глубина" value={wtDepthFilter || ""} onChange={(e) => setWtDepthFilter(e.target.value || null)} className="px-2 py-1 border rounded" />
            <input placeholder="Толщина" value={wtThicknessFilter || ""} onChange={(e) => setWtThicknessFilter(e.target.value || null)} className="px-2 py-1 border rounded" />
            <input placeholder="Завал" value={wtEdgeFilter || ""} onChange={(e) => setWtEdgeFilter(e.target.value || null)} className="px-2 py-1 border rounded" />
        </div>
      )}
      {selectedCategory === "Оснащение шкафов" && ("""

if target_cat_ui in content:
    content = content.replace(target_cat_ui, replacement_cat_ui, 1)
    with open('src/App.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Catalog UI added")
else:
    print("ERROR: Catalog UI target not found")

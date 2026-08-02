const fs = require('fs');
let code = fs.readFileSync('src/components/Landing/LandingSettingsView.tsx', 'utf8');

const target1 = `  const autoSlug = companyData?.name ? transliterate(companyData.name) : (companyData?.id || "catalog");
  const effectiveAlias = landingConfig.alias || autoSlug;`;

const replacement1 = `  const companySlug = companyData?.name ? transliterate(companyData.name) : (companyData?.id || "company");
  const effectiveAlias = landingConfig.alias || "catalog";`;
code = code.replace(target1, replacement1);

const target2 = `              {/* Alias input */}
              <div>
                <label className="block text-xs font-black uppercase text-gray-500 tracking-wider mb-1.5">
                  Адрес витрины (Название компании)
                </label>
                <div className="flex rounded-xl shadow-sm">
                  <span className="inline-flex items-center px-3.5 rounded-l-xl border border-r-0 border-gray-300 bg-gray-100 text-gray-600 text-xs font-mono font-bold shrink-0">
                    {currentHost}/
                  </span>
                  <input
                    type="text"
                    value={effectiveAlias}
                    readOnly
                    disabled
                    className="block w-full min-w-0 flex-1 rounded-none rounded-r-xl border border-gray-200 px-3.5 py-2.5 text-sm font-mono font-bold text-gray-500 bg-gray-50 cursor-not-allowed"
                  />
                </div>
                <div className="mt-2 p-3 bg-blue-50/80 rounded-xl border border-blue-100 text-xs text-blue-900 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-blue-950">
                    <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>Автоматически сгенерированный адрес</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Адрес витрины генерируется автоматически из названия вашей компании и <b>не может быть изменен вручную</b>. 
                    Ваша страница доступна по адресу: <code className="bg-white px-1.5 py-0.5 rounded border border-blue-200 font-mono font-bold text-blue-700">/{effectiveAlias}</code>, а вложенные страницы (например, каталог) имеют формат <code className="bg-white px-1.5 py-0.5 rounded border border-blue-200 font-mono font-bold text-blue-700">/{effectiveAlias}/catalog</code>.
                  </p>
                </div>
              </div>`;

const replacement2 = `              {/* Alias input */}
              <div>
                <label className="block text-xs font-black uppercase text-gray-500 tracking-wider mb-1.5">
                  Название страницы витрины (Например: moduli, catalog, shop)
                </label>
                <div className="flex rounded-xl shadow-sm">
                  <span className="inline-flex items-center px-3.5 rounded-l-xl border border-r-0 border-gray-300 bg-gray-100 text-gray-600 text-xs font-mono font-bold shrink-0">
                    {currentHost}/{companySlug}/
                  </span>
                  <input
                    type="text"
                    value={landingConfig.alias}
                    onChange={handleAliasChange}
                    placeholder="catalog"
                    className="block w-full min-w-0 flex-1 rounded-none rounded-r-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:ring-blue-500 font-mono font-bold text-gray-900 bg-white"
                  />
                </div>
                <div className="mt-2 p-3 bg-blue-50/80 rounded-xl border border-blue-100 text-xs text-blue-900 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-blue-950">
                    <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>Структура адреса</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Название компании (<code className="bg-white px-1 py-0.5 rounded border border-blue-200 font-mono font-bold text-blue-700">{companySlug}</code>) неизменно и привязывает витрину к вашему профилю. Название самой витрины вы можете менять по своему усмотрению (по умолчанию <code className="bg-white px-1 py-0.5 rounded border border-blue-200 font-mono font-bold text-blue-700">catalog</code>).
                  </p>
                </div>
              </div>`;
code = code.replace(target1, replacement1);
code = code.replace(target2, replacement2);

const target3 = `    : \`\${currentOrigin}/\${effectiveAlias}\`;`;
const replacement3 = `    : \`\${currentOrigin}/\${companySlug}/\${effectiveAlias}\`;`;
code = code.replace(target3, replacement3);

const target4 = `                    Например, страница модулей <code className="bg-slate-900 px-1 py-0.5 rounded text-emerald-300">{currentHost}/{effectiveAlias}/moduli</code> 
                    будет автоматически доступна по адресу <code className="bg-slate-900 px-1 py-0.5 rounded text-emerald-300">shop.mebel-faktura.ru/moduli</code>.`;

const replacement4 = `                    Например, страница витрины <code className="bg-slate-900 px-1 py-0.5 rounded text-emerald-300">{currentHost}/{companySlug}/{effectiveAlias}</code> 
                    будет автоматически доступна по вашему домену <code className="bg-slate-900 px-1 py-0.5 rounded text-emerald-300">shop.mebel-faktura.ru</code>, а переход в категорию кухни — по <code className="bg-slate-900 px-1 py-0.5 rounded text-emerald-300">shop.mebel-faktura.ru/kuhni</code>.`;
code = code.replace(target4, replacement4);

fs.writeFileSync('src/components/Landing/LandingSettingsView.tsx', code);
console.log("Updated LandingSettingsView.tsx");

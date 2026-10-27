const fs = require('fs');
let code = fs.readFileSync('src/components/Landing/LandingSettingsView.tsx', 'utf8');

const targetStr = `                  <p className="text-xs text-slate-300 leading-relaxed">
                    Чтобы ваш каталог открывался по вашему собственному адресу (например, <code className="text-emerald-300 font-mono">shop.mebel-faktura.ru</code>), внесите записи в личной панели регистратора вашего домена (<b>Reg.ru</b>, <b>Beget</b>, <b>Timeweb</b>, <b>Cloudflare</b>, <b>Яндекс.360</b> и др.):
                  </p>`;

const replacementStr = `                  <p className="text-xs text-slate-300 leading-relaxed mb-2">
                    Чтобы ваша витрина открывалась по вашему собственному адресу (например, <code className="text-emerald-300 font-mono">shop.mebel-faktura.ru</code>), внесите записи в панели регистратора вашего домена (<b>Reg.ru</b>, <b>Beget</b>, <b>Timeweb</b> и др.).
                  </p>
                  <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 text-xs text-slate-200 mb-3">
                    <b className="text-emerald-400">Обратите внимание:</b> При привязке домена к витрине автоматически привязывается весь ваш каталог и все категории! 
                    Например, страница модулей <code className="bg-slate-900 px-1 py-0.5 rounded text-emerald-300">{currentHost}/{effectiveAlias}/moduli</code> 
                    будет автоматически доступна по адресу <code className="bg-slate-900 px-1 py-0.5 rounded text-emerald-300">shop.mebel-faktura.ru/moduli</code>.
                  </div>`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, replacementStr);
  fs.writeFileSync('src/components/Landing/LandingSettingsView.tsx', code);
  console.log("Instructions updated successfully.");
} else {
  console.log("Target string not found.");
}

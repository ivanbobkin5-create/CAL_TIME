import React, { useState } from "react";
import { X, Link2, Building2, CheckCircle2, AlertCircle, Loader2, KeyRound, Mail } from "lucide-react";

interface LinkBitrixAccountModalProps {
  b24Domain: string;
  onSuccess: (updatedCompanyData: any) => void;
  onClose: () => void;
}

export const LinkBitrixAccountModal: React.FC<LinkBitrixAccountModalProps> = ({
  b24Domain,
  onSuccess,
  onClose
}) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg("Заполните e-mail и пароль вашего веб-аккаунта");
      return;
    }

    setIsLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await fetch("/api/bitrix24/link-web-company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          b24Domain,
          webEmail: email,
          webPassword: password
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || "Не удалось связать аккаунты");
      } else {
        setSuccessMsg("Успешно! Аккаунт сайта привязан к порталу Битрикс24.");
        setTimeout(() => {
          onSuccess(data.companyData);
          onClose();
        }, 1200);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Ошибка подключения к серверу");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-zoomIn">
        
        {/* Header */}
        <div className="bg-white border-b border-[#dfe5ec] p-6 text-[#333333] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs border border-blue-500/20">
              <Link2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-[#1058d0]">Мебель План</h3>
              <p className="text-xs text-[#535c69]">Объедините базу данных сайта и Битрикс24</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-[#f5f7f8] hover:bg-[#eef2f4] text-[#535c69] hover:text-[#333333] flex items-center justify-center transition-all cursor-pointer border border-[#d5dbe0]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleLink} className="p-6 space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-950 space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-blue-900">
              <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Портал Битрикс24: {b24Domain}</span>
            </div>
            <p className="text-[11px] text-blue-800 leading-relaxed">
              Введите логин и пароль компании, под которой вы регистрировались на сайте mebel-plan.ru, чтобы подтянуть прайсы, проекты и заказы.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
              E-mail веб-аккаунта (Логин):
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="director@mycompany.ru"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
              Пароль:
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Связывание...</span>
                </>
              ) : (
                <>
                  <Link2 className="w-4 h-4" />
                  <span>Связать аккаунты</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

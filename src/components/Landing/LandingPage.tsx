import React, { useState } from 'react';
import { AppIcon } from '../Common/AppIcon';
import { 
  Calculator, 
  LayoutDashboard, 
  Database, 
  ShoppingBag, 
  ChevronRight, 
  ChevronDown,
  CheckCircle2,
  Factory,
  Users,
  ArrowRight,
  Phone,
  Sparkles,
  Percent,
  Tag,
  Gift,
  QrCode,
  Wrench,
  Building2,
  Cloud,
  FileText,
  ShieldCheck,
  Check,
  Layers,
  Smartphone,
  Cpu,
  BarChart3,
  HardDrive,
  Clock,
  PackageCheck,
  Zap,
  ExternalLink,
  Mail,
  MessageSquare,
  Presentation,
  X,
  User,
  Send,
  Loader2,
  FileSpreadsheet,
  Scissors,
  HelpCircle,
  CheckCheck,
  Menu,
  LogIn
} from 'lucide-react';
import { motion } from 'motion/react';

export const LandingPage = ({ onLogin, onRegister }: { onLogin: () => void, onRegister: () => void }) => {
  const [activeErpTab, setActiveErpTab] = useState<'shopfloor' | 'installer' | 'bitrix' | 'storage'>('shopfloor');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [isLeftMenuOpen, setIsLeftMenuOpen] = useState(false);
  const [feedbackModalType, setFeedbackModalType] = useState<'contact_developer' | 'request_demo' | null>(null);
  const [feedbackName, setFeedbackName] = useState('');
  const [feedbackEmail, setFeedbackEmail] = useState('');
  const [feedbackPhone, setFeedbackPhone] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackConsent, setFeedbackConsent] = useState(false);
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  const [feedbackError, setFeedbackError] = useState('');

  const openFeedbackModal = (type: 'contact_developer' | 'request_demo') => {
    setFeedbackModalType(type);
    setFeedbackSuccess(false);
    setFeedbackError('');
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackName.trim() || !feedbackEmail.trim() || !feedbackPhone.trim()) {
      setFeedbackError('Пожалуйста, заполните имя, e-mail и телефон.');
      return;
    }
    if (!feedbackConsent) {
      setFeedbackError('Необходимо подтвердить согласие на обработку персональных данных.');
      return;
    }
    setFeedbackSubmitting(true);
    setFeedbackError('');
    try {
      const res = await fetch('/api/landing/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: feedbackModalType,
          name: feedbackName.trim(),
          email: feedbackEmail.trim(),
          phone: feedbackPhone.trim(),
          message: feedbackMessage.trim(),
          consent: feedbackConsent,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Ошибка при отправке заявки');
      }
      setFeedbackSuccess(true);
      setFeedbackName('');
      setFeedbackEmail('');
      setFeedbackPhone('');
      setFeedbackMessage('');
      setFeedbackConsent(false);
    } catch (err: any) {
      setFeedbackError(err?.message || 'Не удалось отправить сообщение. Попробуйте позже.');
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  const faqItems = [
    {
      question: 'Какие выгрузки из Базис-Мебельщик и Pro100 поддерживает калькулятор?',
      answer: 'Система автоматически распознает стандартные таблицы и сметы из Базис-Мебельщик (.xlsx, .xls, .csv, списки панелей и фурнитуры) и отчеты раскроя из Pro100 (включая файлы lista_formatek без заголовков). Калькулятор сам определяет размеры деталей, толщину, кромку, площади МДФ/ЛДСП и предлагает удобное сопоставление с вашей базой материалов.'
    },
    {
      question: 'Можно ли загрузить собственные прайс-листы поставщиков ЛДСП, МДФ и фурнитуры?',
      answer: 'Да. Вы можете вести собственные каталоги плитных материалов, кромок, фасадов, столешниц и фурнитуры, настраивать форматы листов (например, 2800×2070 мм), стоимость распила, кромления, присадки, а также индивидуальные коэффициенты наценки и отходов.'
    },
    {
      question: 'Нужно ли покупать специальное оборудование для QR-учета в цеху и работы сборщиков?',
      answer: 'Нет. В цеху можно использовать любой обычный беспроводной 2D-сканер штрихкодов (подключается к любому ПК или планшету) либо камеру смартфона. Выездные сборщики работают через мобильный веб-кабинет (PWA) прямо со своего телефона — с фотофиксацией и подписью Акта пальцем на экране.'
    },
    {
      question: 'Как формируются документы для клиента (КП, спецификация, договор)?',
      answer: 'После расчета заказа вы в один клик формируете коммерческое предложение (PDF) с логотипом вашей компании, эскизом изделия и детализацией стоимости, а в юридическом модуле — готовый Договор, Спецификацию и Акт приема-передачи мебели.'
    },
    {
      question: 'Помогаете ли вы с внедрением и настройкой под наше производство?',
      answer: 'Конечно! Оставьте заявку через кнопку «Запросить демонстрацию» — мы проведем онлайн-показ системы на примере ваших реальных файлов из Pro100 или Базис-Мебельщик, поможем настроить прайсы, участки цеха и интеграцию с Битрикс24.'
    }
  ];

  const navItems = [
    { href: '#import-cutting', label: 'Базис / Pro100 & Раскрой', icon: Scissors, accent: false },
    { href: '#features', label: 'Возможности', icon: LayoutDashboard, accent: false },
    { href: '#erp-module', label: 'ERP Производство', icon: Factory, accent: true },
    { href: '#workflow', label: 'Путь заказа (4 шага)', icon: Layers, accent: false },
    { href: '#marketing', label: 'Маркетинг и Акции', icon: Percent, accent: false },
    { href: '#solutions', label: 'Для кого', icon: Users, accent: false },
    { href: '#faq', label: 'Частые вопросы', icon: HelpCircle, accent: false },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Clean Uncluttered Header */}
      <nav className="fixed top-0 left-0 right-0 bg-white/85 backdrop-blur-md z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsLeftMenuOpen((prev) => !prev)}
                className="inline-flex items-center justify-center w-10 h-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-blue-600 transition-all cursor-pointer shadow-2xs shrink-0"
                title="Открыть навигацию по разделам"
                aria-label="Меню разделов"
              >
                {isLeftMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              <a href="#" className="flex items-center gap-2.5 shrink-0">
                <AppIcon className="w-10 h-10 rounded-xl shrink-0 shadow-lg shadow-blue-200" />
                <span className="text-xl font-black text-gray-900 tracking-tight hidden sm:inline whitespace-nowrap">
                  Мебель <span className="text-blue-600">План</span>
                </span>
              </a>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 relative z-30 shrink-0">
              <div className="hidden lg:flex items-center gap-2 text-xs text-gray-500 font-medium mr-1">
                <Phone className="w-3.5 h-3.5 text-blue-600" />
                <span className="hover:text-blue-600 transition-colors font-bold">+7 (812) 507-99-27 <span className="text-gray-400 font-normal">доб. 2</span></span>
              </div>
              <button
                type="button"
                onClick={() => openFeedbackModal('contact_developer')}
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-blue-200 bg-blue-50/70 hover:bg-blue-100/80 text-blue-700 text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap"
              >
                <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                <span>Связаться</span>
              </button>
              <button 
                type="button"
                onClick={onLogin}
                className="hidden sm:inline-flex text-xs sm:text-sm font-bold text-gray-700 hover:text-blue-600 transition-colors cursor-pointer px-3 py-2 rounded-lg hover:bg-gray-100 whitespace-nowrap"
              >
                Войти
              </button>
              <button 
                type="button"
                onClick={onRegister}
                className="px-3.5 sm:px-5 py-2 sm:py-2.5 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 shadow-md shadow-blue-200 transition-all cursor-pointer whitespace-nowrap shrink-0"
              >
                Начать бесплатно
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Left Floating Navigation Dock (Always accessible on desktop left edge) */}
      <aside
        aria-label="Быстрая навигация"
        className="fixed left-4 top-1/2 -translate-y-1/2 z-40 hidden xl:flex flex-col gap-1.5 p-2 bg-white/90 backdrop-blur-md border border-slate-200/90 rounded-2xl shadow-xl"
      >
        {navItems.map((item) => {
          const IconComponent = item.icon;
          return (
            <a
              key={item.href}
              href={item.href}
              className={`group relative flex items-center gap-2.5 p-2.5 rounded-xl transition-all ${
                item.accent
                  ? 'bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white'
                  : 'text-slate-600 hover:bg-blue-50 hover:text-blue-600'
              }`}
            >
              <IconComponent className="w-4 h-4 shrink-0" />
              <span className="pointer-events-none absolute left-full ml-3 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold whitespace-nowrap opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all shadow-lg">
                {item.label}
              </span>
            </a>
          );
        })}
        <div className="my-1 border-t border-slate-200/80" />
        <button
          type="button"
          onClick={() => openFeedbackModal('request_demo')}
          className="group relative flex items-center justify-center p-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-all cursor-pointer"
        >
          <Presentation className="w-4 h-4 shrink-0" />
          <span className="pointer-events-none absolute left-full ml-3 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold whitespace-nowrap opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all shadow-lg">
            Запросить демонстрацию
          </span>
        </button>
      </aside>

      {/* Expandable Left Floating Menu Panel (Triggered by Menu button in header) */}
      {isLeftMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/20 backdrop-blur-2xs"
          onClick={() => setIsLeftMenuOpen(false)}
        >
          <div
            className="fixed left-4 top-20 w-72 bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border border-slate-200/90 p-4 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-2 pb-2 border-b border-slate-100">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                Навигация по странице
              </span>
              <button
                type="button"
                onClick={() => setIsLeftMenuOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              {navItems.map((item) => {
                const IconComponent = item.icon;
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsLeftMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      item.accent
                        ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-blue-600'
                    }`}
                  >
                    <IconComponent className={`w-4 h-4 ${item.accent ? 'text-indigo-600' : 'text-blue-600'}`} />
                    <span>{item.label}</span>
                  </a>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-100 space-y-2">
              <button
                type="button"
                onClick={() => {
                  setIsLeftMenuOpen(false);
                  onLogin();
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <LogIn className="w-4 h-4 text-slate-600" />
                <span>Войти в аккаунт</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsLeftMenuOpen(false);
                  openFeedbackModal('request_demo');
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
              >
                <Presentation className="w-4 h-4" />
                <span>Запросить демонстрацию</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsLeftMenuOpen(false);
                  openFeedbackModal('contact_developer');
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <MessageSquare className="w-4 h-4 text-blue-600" />
                <span>Связаться с разработчиком</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="pt-28 pb-16 px-4 relative overflow-hidden bg-gradient-to-b from-slate-50/70 via-white to-white">
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 text-xs font-bold text-blue-700 tracking-wide uppercase mb-5">
            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
            <span>Платформа автоматизации мебельного бизнеса</span>
            <span className="text-slate-300">·</span>
            <span className="text-slate-600">Салон + Технолог + Цех</span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black text-gray-900 mb-6 tracking-tight leading-[1.08]">
            Умный калькулятор мебели & <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-slate-900">
              ERP Мебельное производство
            </span>
          </h1>

          <p className="text-lg md:text-xl text-gray-500 max-w-3xl mx-auto mb-9 leading-relaxed">
            Загружайте спецификации из <strong className="text-slate-800 font-bold">Базис-Мебельщик</strong> и <strong className="text-slate-800 font-bold">Pro100</strong>, автоматически стройте карты раскроя, формируйте КП за 10 секунд и управляйте цехом по QR-кодам со сквозной синхронизацией с Битрикс24.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
            <button 
              onClick={onRegister}
              className="w-full sm:w-auto px-9 py-4 bg-blue-600 text-white text-base font-black rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-200/80 transition-all flex items-center justify-center gap-2 group cursor-pointer"
            >
              Попробовать бесплатно <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              type="button"
              onClick={() => openFeedbackModal('request_demo')}
              className="w-full sm:w-auto px-8 py-4 bg-white text-slate-900 text-base font-extrabold rounded-2xl border-2 border-slate-200 hover:border-blue-600 hover:text-blue-600 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <Presentation className="w-5 h-5 text-blue-600" />
              <span>Запросить демонстрацию</span>
            </button>
            <a 
              href="#erp-module"
              className="w-full sm:w-auto px-8 py-4 bg-slate-900 text-white text-base font-bold rounded-2xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-slate-200"
            >
              <Factory className="w-5 h-5 text-amber-400" />
              <span>Обзор модуля ERP</span>
            </a>
          </div>

          {/* Interactive Product Dashboard Mockup */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-6xl mx-auto text-left bg-slate-900 rounded-3xl p-3 sm:p-4 shadow-2xl border border-slate-800"
          >
            {/* Window Top Bar */}
            <div className="flex items-center justify-between px-3 pb-3 border-b border-slate-800 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500/80"></span>
                <span className="w-3 h-3 rounded-full bg-amber-400/80"></span>
                <span className="w-3 h-3 rounded-full bg-emerald-500/80"></span>
                <span className="ml-2 font-mono text-[11px] text-slate-300 font-semibold">
                  Мебель План — Заказ № 11-0926-11 (Импорт из Pro100 / Базис-Мебельщик)
                </span>
              </div>
              <div className="hidden sm:flex items-center gap-3 text-[11px]">
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Детали и кромка распознаны
                </span>
                <span className="text-slate-600">·</span>
                <span className="text-sky-400 font-semibold">Синхронизировано с цехом</span>
              </div>
            </div>

            {/* Inner Workspace Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-4">
              {/* Left Column: Imported Spec & Materials */}
              <div className="lg:col-span-5 bg-slate-950 rounded-2xl p-4 border border-slate-800/90 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <FileSpreadsheet className="w-4 h-4 text-blue-400" />
                      Спецификация и материалы
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">38 деталей · 4.82 м²</span>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-white">EGGER Диамант серый U963 ST9</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">ЛДСП 16 мм · 2800×2070 мм · Кромка ПВХ 19×0.8</div>
                      </div>
                      <span className="font-mono font-bold text-blue-400 text-xs shrink-0 ml-2">2 листа</span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-white">МДФ AGT Supramat Сахара</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">Фасадные полотна 18 мм · ЧПУ присадка</div>
                      </div>
                      <span className="font-mono font-bold text-indigo-400 text-xs shrink-0 ml-2">1.94 м²</span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-white">Комплект фурнитуры и крепежа</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">Петли с доводчиком (12 шт.), Направляющие скрытого монтажа (4 компл.)</div>
                      </div>
                      <span className="font-mono font-bold text-emerald-400 text-xs shrink-0 ml-2">В смете</span>
                    </div>
                  </div>
                </div>

                {/* Summary Bar inside left col */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Итоговая стоимость сметы</div>
                    <div className="text-xl font-black text-white">148 650 ₽ <span className="text-xs font-semibold text-emerald-400 ml-1">(Маржа 42%)</span></div>
                  </div>
                  <button
                    type="button"
                    onClick={onRegister}
                    className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    Открыть в калькуляторе →
                  </button>
                </div>
              </div>

              {/* Right Column: Visual 2D Cutting Map */}
              <div className="lg:col-span-7 bg-slate-950 rounded-2xl p-4 border border-slate-800/90 flex flex-col justify-between">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <Scissors className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
                      Автоматическая карта раскроя · Лист №1 (2800 × 2070 мм)
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] font-mono">
                    <span className="text-emerald-400 font-bold">КИМ: 91.8%</span>
                    <span className="text-slate-600">·</span>
                    <span className="text-slate-400">Пропил: 4 мм</span>
                    <span className="text-slate-600">·</span>
                    <span className="text-amber-400">Кромка: 44.6 пог.м</span>
                  </div>
                </div>

                {/* SVG 2D Nesting Map Illustration */}
                <div className="relative bg-slate-900 rounded-xl p-3 border border-slate-800">
                  <svg viewBox="0 0 560 240" className="w-full h-auto rounded-lg">
                    {/* Sheet Background */}
                    <rect x="2" y="2" width="556" height="236" rx="4" fill="#0f172a" stroke="#334155" strokeWidth="2" />
                    
                    {/* Row 1 parts */}
                    <g>
                      <rect x="8" y="8" width="160" height="86" fill="#1e3a8a" stroke="#60a5fa" strokeWidth="1.5" rx="2" />
                      <text x="88" y="48" fill="#e2e8f0" fontSize="10" fontWeight="bold" textAnchor="middle">Боковина левая</text>
                      <text x="88" y="63" fill="#93c5fd" fontSize="9" fontFamily="monospace" textAnchor="middle">2124 × 560 мм [Кр: ПВХ]</text>

                      <rect x="172" y="8" width="160" height="86" fill="#1e3a8a" stroke="#60a5fa" strokeWidth="1.5" rx="2" />
                      <text x="252" y="48" fill="#e2e8f0" fontSize="10" fontWeight="bold" textAnchor="middle">Боковина правая</text>
                      <text x="252" y="63" fill="#93c5fd" fontSize="9" fontFamily="monospace" textAnchor="middle">2124 × 560 мм [Кр: ПВХ]</text>

                      <rect x="336" y="8" width="136" height="86" fill="#1e40af" stroke="#60a5fa" strokeWidth="1.5" rx="2" />
                      <text x="404" y="48" fill="#e2e8f0" fontSize="10" fontWeight="bold" textAnchor="middle">Перегородка</text>
                      <text x="404" y="63" fill="#93c5fd" fontSize="9" fontFamily="monospace" textAnchor="middle">1768 × 540 мм</text>

                      <rect x="476" y="8" width="76" height="86" fill="#312e81" stroke="#818cf8" strokeWidth="1.5" rx="2" />
                      <text x="514" y="48" fill="#e0e7ff" fontSize="9" fontWeight="bold" textAnchor="middle">Цоколь</text>
                      <text x="514" y="62" fill="#a5b4fc" fontSize="8" fontFamily="monospace" textAnchor="middle">1000 × 100</text>
                    </g>

                    {/* Row 2 parts */}
                    <g>
                      <rect x="8" y="98" width="115" height="72" fill="#065f46" stroke="#34d399" strokeWidth="1.5" rx="2" />
                      <text x="65" y="132" fill="#ecfdf5" fontSize="10" fontWeight="bold" textAnchor="middle">Горизонт верх</text>
                      <text x="65" y="146" fill="#6ee7b7" fontSize="8.5" fontFamily="monospace" textAnchor="middle">1168 × 560 мм</text>

                      <rect x="127" y="98" width="115" height="72" fill="#065f46" stroke="#34d399" strokeWidth="1.5" rx="2" />
                      <text x="184" y="132" fill="#ecfdf5" fontSize="10" fontWeight="bold" textAnchor="middle">Горизонт низ</text>
                      <text x="184" y="146" fill="#6ee7b7" fontSize="8.5" fontFamily="monospace" textAnchor="middle">1168 × 560 мм</text>

                      <rect x="246" y="98" width="98" height="72" fill="#0f766e" stroke="#2dd4bf" strokeWidth="1.5" rx="2" />
                      <text x="295" y="132" fill="#f0fdfa" fontSize="9.5" fontWeight="bold" textAnchor="middle">Полка №1</text>
                      <text x="295" y="146" fill="#5eead4" fontSize="8.5" fontFamily="monospace" textAnchor="middle">868 × 540 мм</text>

                      <rect x="348" y="98" width="98" height="72" fill="#0f766e" stroke="#2dd4bf" strokeWidth="1.5" rx="2" />
                      <text x="397" y="132" fill="#f0fdfa" fontSize="9.5" fontWeight="bold" textAnchor="middle">Полка №2</text>
                      <text x="397" y="146" fill="#5eead4" fontSize="8.5" fontFamily="monospace" textAnchor="middle">868 × 540 мм</text>

                      <rect x="450" y="98" width="102" height="72" fill="#1e293b" stroke="#475569" strokeWidth="1" strokeDasharray="4 3" rx="2" />
                      <text x="501" y="134" fill="#64748b" fontSize="9" fontFamily="monospace" textAnchor="middle">Деловой остаток</text>
                      <text x="501" y="147" fill="#475569" fontSize="8" fontFamily="monospace" textAnchor="middle">910 × 560 мм</text>
                    </g>

                    {/* Row 3 parts */}
                    <g>
                      <rect x="8" y="174" width="105" height="58" fill="#3730a3" stroke="#818cf8" strokeWidth="1.5" rx="2" />
                      <text x="60" y="201" fill="#e0e7ff" fontSize="9" fontWeight="bold" textAnchor="middle">Бок ящика (4 шт)</text>
                      <text x="60" y="214" fill="#a5b4fc" fontSize="8" fontFamily="monospace" textAnchor="middle">500 × 140 мм</text>

                      <rect x="117" y="174" width="105" height="58" fill="#3730a3" stroke="#818cf8" strokeWidth="1.5" rx="2" />
                      <text x="169" y="201" fill="#e0e7ff" fontSize="9" fontWeight="bold" textAnchor="middle">Фасад внутр. (2 шт)</text>
                      <text x="169" y="214" fill="#a5b4fc" fontSize="8" fontFamily="monospace" textAnchor="middle">716 × 140 мм</text>

                      <rect x="226" y="174" width="140" height="58" fill="#1e3a8a" stroke="#60a5fa" strokeWidth="1.5" rx="2" />
                      <text x="296" y="201" fill="#e2e8f0" fontSize="9" fontWeight="bold" textAnchor="middle">Ребро жесткости</text>
                      <text x="296" y="214" fill="#93c5fd" fontSize="8" fontFamily="monospace" textAnchor="middle">1168 × 200 мм</text>

                      <rect x="370" y="174" width="182" height="58" fill="#0f172a" stroke="#334155" strokeWidth="1" strokeDasharray="3 3" rx="2" />
                      <text x="461" y="206" fill="#475569" fontSize="8.5" fontFamily="monospace" textAnchor="middle">Отход раскроя (8.2%)</text>
                    </g>
                  </svg>
                </div>

                {/* Bottom Action Strip inside Cutting Map */}
                <div className="pt-3 mt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-4 text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <QrCode className="w-3.5 h-3.5 text-indigo-400" />
                      Печать бирок с QR-кодами
                    </span>
                    <span className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-emerald-400" />
                      Экспорт КП и Договора в PDF
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">Авто-учет направления текстуры</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Key Quantitative Metrics Strip */}
          <div className="max-w-6xl mx-auto mt-10 grid grid-cols-2 lg:grid-cols-4 gap-4 text-left">
            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <div className="text-2xl sm:text-3xl font-black text-blue-600">10 сек</div>
              <div className="text-xs font-bold text-slate-800 mt-1">Расчет сметы по файлу</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Прямой импорт выгрузок из Базис-Мебельщик и Pro100</div>
            </div>
            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <div className="text-2xl sm:text-3xl font-black text-indigo-600">до 94%</div>
              <div className="text-xs font-bold text-slate-800 mt-1">Полезный выход плиты</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Умный алгоритм раскроя листов ЛДСП, МДФ и ХДФ</div>
            </div>
            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <div className="text-2xl sm:text-3xl font-black text-emerald-600">100%</div>
              <div className="text-xs font-bold text-slate-800 mt-1">Прозрачность в цеху</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Безклавиатурный QR-трекинг стадий от распила до упаковки</div>
            </div>
            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <div className="text-2xl sm:text-3xl font-black text-slate-900">24/7</div>
              <div className="text-xs font-bold text-slate-800 mt-1">Связь с Битрикс24 и Облаком</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Авто-выгрузка фотоотчетов сборщиков на Яндекс.Диск</div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* BAZIS-MEBELSHCHIK & PRO100 IMPORT + CUTTING SHOWCASE */}
      {/* ========================================================================= */}
      <section className="py-20 bg-white border-t border-slate-100" id="import-cutting">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6 space-y-6">
              <div className="text-xs font-black uppercase tracking-wider text-blue-600">
                Технологический модуль импорта и раскроя
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">
                Загружайте проекты из <span className="text-blue-600">Базис-Мебельщик</span> и <span className="text-indigo-600">Pro100</span> без ручного перебивания
              </h2>
              <p className="text-slate-600 leading-relaxed text-base">
                Больше не нужно тратить часы на перенос размеров в таблицах. Перетащите файл выгрузки из вашей программы проектирования — система мгновенно разложит детали по материалам и толщинам, посчитает метраж кромки, подберет фурнитуру и построит оптимальные карты раскроя.
              </p>

              <div className="space-y-4 pt-2">
                <div className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Умное распознавание сложных и неполных файлов</h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Поддержка файлов <code className="text-slate-700 font-semibold">.xlsx, .xls, .csv (lista_formatek), .xml</code>. Если в отчете Pro100 есть строки без наименования, система предложит в 1 клик назначить им тип материала (ЛДСП, МДФ) или исключить из расчета.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Scissors className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Визуальные карты раскроя и точный учет кромки</h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Автоматический расчет количества листов с учетом ширины пропила, обпила края листа, направления текстуры (декора) и припусков на кромление ПВХ/АБС по каждой стороне детали.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Автоматическое запоминание соответствий (SKU-маппинг)</h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Сопоставьте материал или петлю из Базиса со своим прайс-листом всего один раз — при следующих загрузках система подставит ваши цены и декоры автоматически.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Interactive-style Card */}
            <div className="lg:col-span-6">
              <div className="bg-slate-50 rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-lg space-y-5">
                <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                  <div>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Процесс обработки выгрузки</div>
                    <div className="text-lg font-black text-slate-900 mt-0.5">От файла проекта до готовой сметы</div>
                  </div>
                  <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg">
                    Авто-парсер 2.0
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="bg-white p-4 rounded-2xl border border-slate-200/80 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-600 text-white font-black text-xs flex items-center justify-center">1</div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">Загрузка отчета Базис-Мебельщик / Pro100</div>
                        <div className="text-[11px] text-slate-500">Распознавание панелей, фасадов МДФ, ХДФ, кромки и фурнитуры</div>
                      </div>
                    </div>
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-slate-200/80 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-black text-xs flex items-center justify-center">2</div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">Проверка позиций и привязка к прайс-листу</div>
                        <div className="text-[11px] text-slate-500">Контроль строк без наименования и выбор декоров в 1 клик</div>
                      </div>
                    </div>
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-slate-200/80 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-900 text-white font-black text-xs flex items-center justify-center">3</div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">Генерация карт раскроя, КП и отправка в ERP цеха</div>
                        <div className="text-[11px] text-slate-500">Печать PDF для клиента, формирование Договора и QR-маршрута</div>
                      </div>
                    </div>
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <span className="text-xs text-slate-500 font-medium">
                    Хотите проверить на своём файле из Pro100 или Базис?
                  </span>
                  <button
                    type="button"
                    onClick={onRegister}
                    className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shrink-0"
                  >
                    Загрузить тестовый файл →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Basic Features Grid */}
      <section className="py-20 bg-gray-50 border-t border-gray-100" id="features">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">Всё необходимое для роста продаж и порядка в цеху</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">Единая среда работы для менеджеров салона, технологов, операторов ЧПУ и выездных бригад монтажа</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-3xl shadow-xs border border-gray-100 hover:shadow-xl transition-all group">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 overflow-hidden">
                <AppIcon className="w-14 h-14 rounded-2xl shadow-xs" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Точный расчет сметы и раскроя</h3>
              <p className="text-gray-500 leading-relaxed text-sm">
                Учитывайте всё: от листов ЛДСП, МДФ и кромки до сложной фурнитуры, присадки и услуг монтажа. Гибкие настройки наценок, коэффициентов и налогов.
              </p>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-xs border border-gray-100 hover:shadow-xl transition-all group">
              <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                <LayoutDashboard className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Облачная база проектов и КП</h3>
              <p className="text-gray-500 leading-relaxed text-sm">
                Храните все расчеты в облаке. Формируйте брендированные коммерческие предложения, договоры и спецификации в PDF с 3D-эскизами проекта.
              </p>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-xs border border-gray-100 hover:shadow-xl transition-all group">
              <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-purple-600 group-hover:text-white transition-all">
                <Factory className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Прямая передача в производство</h3>
              <p className="text-gray-500 leading-relaxed text-sm">
                Отправляйте согласованные заказы напрямую в производственный модуль. Отслеживайте распил, кромку, сборку и отгрузку в реальном времени.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* ERP SHOWCASE PRESENTATION SECTION (FLAGSHIP FEATURE) */}
      {/* ========================================================================= */}
      <section className="py-24 bg-slate-950 text-white relative overflow-hidden" id="erp-module">
        {/* Glow Effects */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          
          {/* Header Title */}
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <div className="inline-flex items-center gap-2 text-indigo-400 text-xs font-black uppercase tracking-wider">
              <Factory className="w-4 h-4 text-indigo-400" />
              <span>Глобальный Модуль Управления Фабрикой</span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
              ERP Мебельное Производство
            </h2>

            <p className="text-slate-400 text-base sm:text-lg leading-relaxed">
              Полноценная система оперативного управления цехом, выездными сборщиками и CRM-интеграцией. Наведите порядок в заказах от распила до сдачи клиенту.
            </p>
          </div>

          {/* ERP Tab Navigation */}
          <div className="flex justify-center mb-10 overflow-x-auto pb-2">
            <div className="p-1.5 bg-slate-900 rounded-2xl border border-slate-800 flex items-center gap-1">
              <button
                onClick={() => setActiveErpTab('shopfloor')}
                className={`px-4 py-2.5 rounded-xl font-extrabold text-xs transition-all flex items-center gap-2 cursor-pointer ${
                  activeErpTab === 'shopfloor' 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <QrCode className="w-4 h-4" />
                <span>Цеховой учет (QR)</span>
              </button>

              <button
                onClick={() => setActiveErpTab('installer')}
                className={`px-4 py-2.5 rounded-xl font-extrabold text-xs transition-all flex items-center gap-2 cursor-pointer ${
                  activeErpTab === 'installer' 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Wrench className="w-4 h-4" />
                <span>Монтаж и Сборка</span>
              </button>

              <button
                onClick={() => setActiveErpTab('bitrix')}
                className={`px-4 py-2.5 rounded-xl font-extrabold text-xs transition-all flex items-center gap-2 cursor-pointer ${
                  activeErpTab === 'bitrix' 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>Битрикс24 CRM</span>
              </button>

              <button
                onClick={() => setActiveErpTab('storage')}
                className={`px-4 py-2.5 rounded-xl font-extrabold text-xs transition-all flex items-center gap-2 cursor-pointer ${
                  activeErpTab === 'storage' 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Cloud className="w-4 h-4" />
                <span>Яндекс.Диск и Хранилище</span>
              </button>
            </div>
          </div>

          {/* Tab Content Display */}
          <div className="bg-slate-900/90 rounded-3xl p-6 sm:p-10 border border-slate-800 shadow-2xl backdrop-blur-md">
            
            {/* TAB 1: SHOPFLOOR & QR */}
            {activeErpTab === 'shopfloor' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-6 space-y-6">
                  <div className="inline-flex items-center gap-2 text-emerald-400 font-black text-xs uppercase tracking-wider">
                    <Zap className="w-3.5 h-3.5 text-amber-400" /> Безклавиатурный контроль цеха
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-black text-white">
                    Учет на участках без мыши и клавиатуры
                  </h3>

                  <p className="text-slate-300 text-sm leading-relaxed">
                    Операторы станочных участков (Распил, Кромка, Присадка ЧПУ, Сборка, Упаковка) используют штрихкод-сканеры. Просто поднесите сканер к QR-коду на маршрутном листе или детали — статус заказа мгновенно обновится.
                  </p>

                  <div className="space-y-3 pt-2 text-xs">
                    <div className="flex items-center gap-3 text-slate-200">
                      <div className="w-6 h-6 rounded-lg bg-indigo-900/60 text-indigo-400 flex items-center justify-center font-bold">1</div>
                      <span>Сканирование QR-кодов деталей и пакетов на любых планшетах/ТСД</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-200">
                      <div className="w-6 h-6 rounded-lg bg-indigo-900/60 text-indigo-400 flex items-center justify-center font-bold">2</div>
                      <span>Автоматический расчет индивидуальной выработки рабочих и тайминга партий</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-200">
                      <div className="w-6 h-6 rounded-lg bg-indigo-900/60 text-indigo-400 flex items-center justify-center font-bold">3</div>
                      <span>Печать QR-команд для переключения статусов прямо на листах раскроя</span>
                    </div>
                  </div>
                </div>

                {/* Visual Widget Preview */}
                <div className="lg:col-span-6">
                  <div className="bg-slate-950 rounded-2xl p-5 border border-slate-800 space-y-4 shadow-xl">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-2">
                        <QrCode className="w-5 h-5 text-indigo-400" />
                        <span className="font-mono text-xs font-bold text-slate-200">Терминал: Участок ЧПУ-Присадки</span>
                      </div>
                      <span className="text-emerald-400 text-[10px] font-bold uppercase">В работе</span>
                    </div>

                    <div className="p-3 bg-slate-900 rounded-xl space-y-2 text-xs font-mono">
                      <div className="text-slate-400 text-[10px]">Текущий заказ в обработке:</div>
                      <div className="text-amber-400 font-bold text-sm">Заказ № 11-0626-11 (Кухня "Лофт")</div>
                      <div className="flex items-center justify-between text-slate-300 pt-1 text-[11px]">
                        <span>Пакет 2/4 (Фасады МДФ)</span>
                        <span className="text-emerald-400">ГОТОВО: 80%</span>
                      </div>
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-full w-[80%]"></div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 text-center">
                        <div className="text-slate-400 text-[9px] uppercase">Оператор</div>
                        <div className="font-bold text-slate-200 mt-0.5">Иван А. (ЧПУ)</div>
                      </div>
                      <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 text-center">
                        <div className="text-slate-400 text-[9px] uppercase">Время смены</div>
                        <div className="font-bold text-emerald-400 mt-0.5">4 ч 20 мин</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: INSTALLER PWA & KANBAN */}
            {activeErpTab === 'installer' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-6 space-y-6">
                  <div className="inline-flex items-center gap-2 text-indigo-300 font-black text-xs uppercase tracking-wider">
                    <Smartphone className="w-3.5 h-3.5 text-indigo-400" /> PWA Кабинет Сборщика & Канбан
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-black text-white">
                    Выездная сборка, актирование и рекламации
                  </h3>

                  <p className="text-slate-300 text-sm leading-relaxed">
                    Диспетчер управляет заказами на интерактивной Канбан-доске стадий. Выездной сборщик работает в автономии со смартфона — формирует отчет о работах, фиксирует фото дефектов и подписывает Акт у клиента графической подписью.
                  </p>

                  <div className="space-y-3 pt-2 text-xs">
                    <div className="flex items-center gap-3 text-slate-200">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Канбан-доска стадий: Ждет назначения → Назначен → В работе → Рекламация → Сдан</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-200">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Прейскурант дополнительных работ (вырезы под мойку, подгонки по месту)</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-200">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Графическая подпись клиента пальцем на экране и Акт приема-передачи</span>
                    </div>
                  </div>
                </div>

                {/* Visual Widget Preview */}
                <div className="lg:col-span-6">
                  <div className="bg-slate-950 rounded-2xl p-5 border border-slate-800 space-y-3 shadow-xl">
                    <div className="flex items-center justify-between text-xs font-bold border-b border-slate-800 pb-2">
                      <span className="text-slate-300 flex items-center gap-1.5">
                        <Wrench className="w-4 h-4 text-indigo-400" /> Акт Выезда Сборщика
                      </span>
                      <span className="text-emerald-400 font-mono">Подписан клиентом</span>
                    </div>

                    <div className="p-3 bg-slate-900 rounded-xl space-y-2 text-xs">
                      <div className="flex justify-between items-center text-slate-200 font-bold">
                        <span>Доп. работы на объекте:</span>
                        <span className="text-amber-400 font-mono">+ 4,500 ₽</span>
                      </div>
                      <div className="text-[11px] text-slate-400 space-y-1 pl-2 border-l-2 border-indigo-500">
                        <div>• Вырез под варочную панель (1,500 ₽)</div>
                        <div>• Установка и подключение вытяжки (3,000 ₽)</div>
                      </div>
                    </div>

                    <div className="p-3 bg-emerald-950/60 rounded-xl border border-emerald-800/80 flex items-center justify-between text-xs text-emerald-200">
                      <div>
                        <div className="font-bold text-[11px]">Электронный Акт № 1042</div>
                        <div className="text-[9px] text-emerald-400">Гарантийный период: 24 месяца</div>
                      </div>
                      <div className="text-emerald-100 text-[10px] font-bold">
                        Подпись в базе
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: BITRIX24 INTEGRATION */}
            {activeErpTab === 'bitrix' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-6 space-y-6">
                  <div className="inline-flex items-center gap-2 text-sky-400 font-black text-xs uppercase tracking-wider">
                    <Building2 className="w-3.5 h-3.5 text-sky-400" /> Двусторонняя Синхронизация CRM
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-black text-white">
                    Бесшовная связь с Битрикс24
                  </h3>

                  <p className="text-slate-300 text-sm leading-relaxed">
                    Двусторонний обмен данными: заказы из Битрикс24 автоматически попадают на производство, а текущие статусы цеха, фотографии от сборщиков и суммы доп. работ моментально возвращаются в карточки сделок и задач CRM.
                  </p>

                  <div className="space-y-3 pt-2 text-xs">
                    <div className="flex items-center gap-3 text-slate-200">
                      <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />
                      <span>Авто-создание задач монтажа в Битрикс24 с выгрузкой отчетов сборщика</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-200">
                      <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />
                      <span>Перемещение стадий сделки в CRM при готовности распила или сборки</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-200">
                      <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />
                      <span>Работа сборщиков через простой интерфейс без необходимости давать им права в CRM</span>
                    </div>
                  </div>
                </div>

                {/* Visual Widget Preview */}
                <div className="lg:col-span-6">
                  <div className="bg-slate-950 rounded-2xl p-5 border border-slate-800 space-y-3 shadow-xl">
                    <div className="flex items-center justify-between text-xs font-bold border-b border-slate-800 pb-2">
                      <span className="text-sky-300 flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-sky-400" /> Битрикс24 Входящий Вебхук
                      </span>
                      <span className="text-emerald-400 font-mono text-[10px]">Активен (Связь 100%)</span>
                    </div>

                    <div className="p-3 bg-slate-900 rounded-xl space-y-2 text-xs">
                      <div className="text-slate-400 text-[10px] font-mono">Синхронизация карточки сделки:</div>
                      <div className="font-bold text-slate-100">Сделка № 4829 • Кухонный гарнитур "Эмаль"</div>
                      <div className="flex items-center justify-between text-[11px] pt-1">
                        <span className="text-slate-400">Стадия в CRM:</span>
                        <span className="text-sky-300 font-bold">Готово к монтажу</span>
                      </div>
                    </div>

                    <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 text-[11px] text-slate-300 flex items-center justify-between">
                      <span>Фотографии монтажа отправлены в комментарии к задаче #1042</span>
                      <ExternalLink className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: YANDEX DISK & STORAGE */}
            {activeErpTab === 'storage' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-6 space-y-6">
                  <div className="inline-flex items-center gap-2 text-amber-400 font-black text-xs uppercase tracking-wider">
                    <Cloud className="w-3.5 h-3.5 text-amber-400" /> Облачное Хранилище Фотоотчетов
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-black text-white">
                    Организованное хранение на Яндекс.Диске
                  </h3>

                  <p className="text-slate-300 text-sm leading-relaxed">
                    Никакой перегрузки внутренней базы ERP. Снимки объективного контроля и фотофиксация брака автоматически раскладываются в структурированные папки по номерам заказов на вашем корпоративном Яндекс.Диске или дублируются в Битрикс24.
                  </p>

                  <div className="space-y-3 pt-2 text-xs">
                    <div className="flex items-center gap-3 text-slate-200">
                      <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Автоматическое создание папок типа <code>/ERP_Фотоотчеты/Заказ_11-0626-11/</code></span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-200">
                      <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Быстрое подключение OAuth-токена в 1 клик с проверкой остатка места</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-200">
                      <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Режимы: «Только Яндекс.Диск», «Только Битрикс24» или «Оба хранилища»</span>
                    </div>
                  </div>
                </div>

                {/* Visual Widget Preview */}
                <div className="lg:col-span-6">
                  <div className="bg-slate-950 rounded-2xl p-5 border border-slate-800 space-y-3 shadow-xl">
                    <div className="flex items-center justify-between text-xs font-bold border-b border-slate-800 pb-2">
                      <span className="text-amber-300 flex items-center gap-1.5">
                        <HardDrive className="w-4 h-4 text-amber-400" /> Яндекс.Диск Корпоративный
                      </span>
                      <span className="text-emerald-400 font-mono text-[10px]">Подключено (Свободно: 84 ГБ)</span>
                    </div>

                    <div className="p-3 bg-slate-900 rounded-xl space-y-2 text-xs font-mono">
                      <div className="text-slate-400 text-[10px]">Структура директории:</div>
                      <div className="text-amber-400 font-bold">/ERP_Фотоотчеты/Заказ_11-0626-11/</div>
                      <div className="text-slate-300 text-[11px] space-y-1 pl-2 border-l border-slate-700">
                        <div>photo_17105820_1.jpg (Фото собранного гарнитура)</div>
                        <div>photo_17105820_2.jpg (Узел примыкания столешницы)</div>
                        <div>photo_17105820_3.jpg (Подписанный Акт сдачи)</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* ERP Bottom CTA */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={onRegister}
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-sm rounded-2xl hover:from-blue-500 hover:to-indigo-500 shadow-xl shadow-indigo-600/30 transition-all cursor-pointer inline-flex items-center gap-2"
            >
              <span>Подключить модуль ERP для вашего производства</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => openFeedbackModal('request_demo')}
              className="px-7 py-4 bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold text-sm rounded-2xl border border-slate-700 transition-all cursor-pointer inline-flex items-center gap-2"
            >
              <Presentation className="w-4 h-4 text-indigo-400" />
              <span>Запросить онлайн-презентацию</span>
            </button>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4-STEP END-TO-END WORKFLOW SECTION */}
      {/* ========================================================================= */}
      <section className="py-20 bg-white border-t border-slate-100" id="workflow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="text-xs font-black uppercase tracking-wider text-indigo-600 mb-2">
              Сквозная цепочка без потерь информации
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900">
              Как устроен путь заказа в «Мебель План»
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200/70 relative">
              <div className="text-xs font-black text-blue-600 uppercase tracking-wider mb-2">Шаг 01 · Салон / Технолог</div>
              <h3 className="text-lg font-extrabold text-slate-900 mb-2">Импорт или быстрый расчет</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Загрузите отчет из Базис-Мебельщик или Pro100 либо задайте габариты вручную. Система мгновенно подберет листы ЛДСП/МДФ, кромку и фурнитуру по вашим прайсам.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200/70 relative">
              <div className="text-xs font-black text-indigo-600 uppercase tracking-wider mb-2">Шаг 02 · Продажа</div>
              <h3 className="text-lg font-extrabold text-slate-900 mb-2">КП, акции и договор</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Примените маркетинговые скидки, сформируйте красивое коммерческое предложение с 3D-визуализацией и распечатайте готовый договор со спецификацией.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200/70 relative">
              <div className="text-xs font-black text-purple-600 uppercase tracking-wider mb-2">Шаг 03 · Производство</div>
              <h3 className="text-lg font-extrabold text-slate-900 mb-2">Карты раскроя и QR-цех</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Передайте заказ в цех одним кликом. Рабочие сканируют QR-коды на распиле, кромке, ЧПУ и упаковке, а руководитель видит готовность каждой детали.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200/70 relative">
              <div className="text-xs font-black text-emerald-600 uppercase tracking-wider mb-2">Шаг 04 · Монтаж и CRM</div>
              <h3 className="text-lg font-extrabold text-slate-900 mb-2">Сборка и подпись Акта</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Сборщик на выезде отмечает доп. работы в телефоне, делает фотоотчет на Яндекс.Диск и берет подпись клиента на экране. Сделка в Битрикс24 закрывается автоматически.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Smart Marketing Section */}
      <section className="py-20 bg-gradient-to-b from-slate-50/70 to-white border-t border-gray-100 overflow-hidden" id="marketing">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="flex-1 space-y-6">
              <div className="text-xs font-black uppercase tracking-wider text-indigo-600">
                Модуль: Маркетинг и Акции
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-gray-900 leading-tight tracking-tight">
                Управляйте продажами через <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                  умный конструктор акций
                </span>
              </h2>
              <p className="text-lg text-gray-500 leading-relaxed">
                Наш инструмент позволяет создавать и автоматизировать любые маркетинговые механики. Моментально применяйте скидки, выделяйте акционные предложения в каталоге и гибко настраивайте параметры для привлечения клиентов — без лишней рутины и сложных расчетов вручную.
              </p>
              
              <div className="space-y-4 pt-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Percent className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">Гибкие условия специальных предложений</h4>
                    <p className="text-sm text-gray-500">Задавайте скидки в процентах или фиксированных суммах на определенные категории фурнитуры, фасадов или услуг.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Tag className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">Фокус на акционном ассортименте</h4>
                    <p className="text-sm text-gray-500">Автоматически выделяйте акционные позиции в каталоге, привлекая внимание менеджеров при проектировании.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Gift className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">Планирование по времени</h4>
                    <p className="text-sm text-gray-500">Устанавливайте даты запуска и завершения акций. Система автоматически активирует и отключит предложения в срок.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Visual Tablet mockup of the promotion mechanism */}
            <div className="flex-1 w-full max-w-lg lg:max-w-none">
              <div className="bg-white rounded-3xl p-6 md:p-8 shadow-xl border border-gray-100 relative">
                <h3 className="font-black text-gray-900 text-xl mb-6 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-blue-600 rounded-full"></span>
                  Конструктор маркетинговых кампаний
                </h3>

                {/* Example Action Item 1 */}
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                        <Tag className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-gray-900 text-sm">Весенняя акция на фасады</div>
                        <div className="text-xs text-blue-600 font-semibold">Скидка 15% • Все пленочные фасады</div>
                      </div>
                    </div>
                    <span className="text-green-700 text-[11px] font-bold uppercase tracking-wider">Активна</span>
                  </div>

                  {/* Example Action Item 2 */}
                  <div className="p-4 bg-purple-50/50 rounded-2xl border border-purple-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center">
                        <Gift className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-gray-900 text-sm">Фурнитура Blum в подарок</div>
                        <div className="text-xs text-purple-600 font-semibold">При заказе кухни от 150 000 ₽</div>
                      </div>
                    </div>
                    <span className="text-green-700 text-[11px] font-bold uppercase tracking-wider">Активна</span>
                  </div>

                  {/* Example Action Item 3 */}
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between opacity-70">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-200 text-gray-500 rounded-xl flex items-center justify-center">
                        <Percent className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-gray-900 text-sm">Новогодний кэшбэк</div>
                        <div className="text-xs text-gray-500 font-semibold">Скидка 20% • Завершена</div>
                      </div>
                    </div>
                    <span className="text-gray-500 text-[11px] font-bold uppercase tracking-wider">Завершена</span>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-100 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-gray-400 block uppercase tracking-wider font-bold mb-1">Интеграция с расчетом</span>
                    <p className="text-sm font-semibold text-gray-700">Акции автоматически применяются в смете</p>
                  </div>
                  <button
                    type="button"
                    onClick={onRegister}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-100 transition-colors cursor-pointer"
                  >
                    + Создать акцию
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Roles Section */}
      <section className="py-20 border-t border-slate-100" id="solutions">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="flex-1">
              <h2 className="text-4xl font-black text-gray-900 mb-8 leading-tight">
                Решения для любого <br />
                <span className="text-blue-600">типа компании</span>
              </h2>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Factory className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">Мебельное производство</h4>
                    <p className="text-sm text-gray-500">Принимайте заказы от дилеров и салонов, стройте карты раскроя, настраивайте цеховой учет (QR) и контролируйте выездные монтажи.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <ShoppingBag className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">Мебельный салон и студия</h4>
                    <p className="text-sm text-gray-500">За секунды считайте заказы клиентам по файлам Pro100 и Базис, применяйте акции, печатайте КП и договоры и передавайте заявки в цех.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">Частный мебельщик и технолог</h4>
                    <p className="text-sm text-gray-500">Профессиональный инструмент для мгновенного расчета себестоимости, раскроя плитных материалов и спецификаций фурнитуры.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex-1 bg-blue-600 rounded-[2.5rem] p-10 sm:p-12 text-white relative overflow-hidden shadow-2xl shadow-blue-200">
              <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
              <div className="relative z-10">
                <h3 className="text-3xl font-bold mb-4">Готовы оптимизировать свой бизнес?</h3>
                <p className="text-blue-100 mb-8 text-base leading-relaxed">
                  Присоединяйтесь к мебельщикам, которые уже используют экосистему «Мебель План» для ускорения расчетов, точного раскроя и прозрачного контроля цеха.
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <button 
                    onClick={onRegister}
                    className="px-8 py-4 bg-white text-blue-600 font-black rounded-2xl hover:bg-blue-50 transition-all shadow-lg cursor-pointer"
                  >
                    Попробовать бесплатно
                  </button>
                  <button
                    type="button"
                    onClick={() => openFeedbackModal('request_demo')}
                    className="px-6 py-4 bg-blue-700/60 hover:bg-blue-700 text-white font-bold rounded-2xl border border-white/25 transition-all cursor-pointer flex items-center gap-2 text-sm"
                  >
                    <Presentation className="w-4 h-4" />
                    Запросить демонстрацию
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* FAQ SECTION */}
      {/* ========================================================================= */}
      <section className="py-20 bg-slate-50/70 border-t border-slate-100" id="faq">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-blue-600 mb-2">
              <HelpCircle className="w-4 h-4" />
              <span>Ответы на частые вопросы</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900">
              Часто задаваемые вопросы
            </h2>
          </div>

          <div className="space-y-3">
            {faqItems.map((item, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={idx}
                  className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden transition-all"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full px-6 py-5 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/60 transition-colors"
                  >
                    <span className="font-bold text-slate-900 text-sm sm:text-base">{item.question}</span>
                    <ChevronDown
                      className={`w-5 h-5 text-slate-400 shrink-0 transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-blue-600' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-5 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                      {item.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-gray-100 bg-white">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <AppIcon className="w-8 h-8 rounded-lg shadow-2xs" />
            <span className="text-lg font-black text-gray-900 tracking-tight">Мебель План</span>
          </div>

          {/* Feedback Action Buttons / Links */}
          <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
            <button
              type="button"
              onClick={() => openFeedbackModal('contact_developer')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 text-slate-700 hover:text-blue-600 text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
              Связаться с разработчиком
            </button>
            <button
              type="button"
              onClick={() => openFeedbackModal('request_demo')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-slate-700 hover:text-indigo-600 text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              <Presentation className="w-3.5 h-3.5 text-indigo-600" />
              Запросить демонстрацию
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 mb-6 text-xs text-slate-500 font-semibold">
            <a href="/terms" target="_blank" rel="noreferrer" className="hover:text-blue-600 transition-colors">
              Лицензионное соглашение (Оферта)
            </a>
            <span>•</span>
            <a href="/privacy" target="_blank" rel="noreferrer" className="hover:text-blue-600 transition-colors">
              Политика конфиденциальности
            </a>
          </div>
          <p className="text-gray-400 text-sm">© 2026 Мебель План. Все права защищены.</p>
        </div>
      </footer>

      {/* Feedback & Demo Request Modal */}
      {feedbackModalType && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
          onClick={() => setFeedbackModalType(null)}
        >
          <div
            className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">
                  {feedbackModalType === 'request_demo'
                    ? 'Запросить демонстрацию'
                    : 'Связаться с разработчиком'}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {feedbackModalType === 'request_demo'
                    ? 'Оставьте контакты — мы проведем презентацию возможностей системы под ваши задачи'
                    : 'Напишите нам по вопросам внедрения, доработок или сотрудничества'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFeedbackModalType(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Switcher */}
            <div className="px-6 pt-4">
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setFeedbackModalType('contact_developer');
                    setFeedbackError('');
                    setFeedbackSuccess(false);
                  }}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    feedbackModalType === 'contact_developer'
                      ? 'bg-white text-blue-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Связаться с разработчиком
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFeedbackModalType('request_demo');
                    setFeedbackError('');
                    setFeedbackSuccess(false);
                  }}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    feedbackModalType === 'request_demo'
                      ? 'bg-white text-indigo-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Запросить демонстрацию
                </button>
              </div>
            </div>

            {feedbackSuccess ? (
              <div className="p-6 text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900">Заявка отправлена!</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Ваше обращение отправлено на <span className="font-semibold text-slate-700">support@mebel-plan.ru</span>. Мы свяжемся с вами в ближайшее время.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFeedbackModalType(null)}
                  className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all cursor-pointer"
                >
                  Закрыть окно
                </button>
              </div>
            ) : (
              <form onSubmit={handleFeedbackSubmit} className="p-6 space-y-4">
                {feedbackError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-xs font-semibold text-red-600">
                    {feedbackError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Ваше имя <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={feedbackName}
                      onChange={(e) => setFeedbackName(e.target.value)}
                      placeholder="Иван Иванов"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    E-mail <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={feedbackEmail}
                      onChange={(e) => setFeedbackEmail(e.target.value)}
                      placeholder="name@company.ru"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Телефон <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      value={feedbackPhone}
                      onChange={(e) => setFeedbackPhone(e.target.value)}
                      placeholder="+7 (999) 000-00-00"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Комментарий (необязательно)
                  </label>
                  <textarea
                    rows={2}
                    value={feedbackMessage}
                    onChange={(e) => setFeedbackMessage(e.target.value)}
                    placeholder={
                      feedbackModalType === 'request_demo'
                        ? 'Укажите удобное время или интересующие модули...'
                        : 'Опишите ваш вопрос или предложение...'
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all resize-none"
                  />
                </div>

                <label className="flex items-start gap-2.5 pt-1 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    required
                    checked={feedbackConsent}
                    onChange={(e) => setFeedbackConsent(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="text-[11px] text-slate-500 leading-relaxed">
                    Я даю согласие на обработку моих персональных данных в соответствии с{' '}
                    <a
                      href="/privacy"
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-blue-600 hover:underline font-semibold"
                    >
                      Политикой конфиденциальности
                    </a>
                  </span>
                </label>

                <div className="pt-2 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setFeedbackModalType(null)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={feedbackSubmitting || !feedbackConsent}
                    className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white flex items-center gap-2 transition-all ${
                      feedbackSubmitting || !feedbackConsent
                        ? 'bg-slate-300 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 cursor-pointer'
                    }`}
                  >
                    {feedbackSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Отправка...
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        Отправить
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

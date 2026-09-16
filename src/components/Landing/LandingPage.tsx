import React, { useState } from 'react';
import { 
  Calculator, 
  LayoutDashboard, 
  Database, 
  ShoppingBag, 
  ChevronRight, 
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
  ExternalLink
} from 'lucide-react';
import { motion } from 'motion/react';

export const LandingPage = ({ onLogin, onRegister }: { onLogin: () => void, onRegister: () => void }) => {
  const [activeErpTab, setActiveErpTab] = useState<'shopfloor' | 'installer' | 'bitrix' | 'storage'>('shopfloor');

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
                <Calculator className="text-white w-6 h-6" />
              </div>
              <span className="text-xl font-black text-gray-900 tracking-tight hidden sm:inline">Мебельный <span className="text-blue-600">калькулятор</span></span>
              <span className="text-xl font-black text-gray-900 tracking-tight sm:hidden">Калькулятор</span>
            </div>

            {/* Nav Menu */}
            <div className="hidden md:flex items-center gap-6 text-xs font-bold text-slate-600">
              <a href="#features" className="hover:text-blue-600 transition-colors">Возможности</a>
              <a href="#erp-module" className="px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 font-extrabold hover:bg-indigo-100 transition-all flex items-center gap-1.5 border border-indigo-100">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>ERP Производство</span>
              </a>
              <a href="#marketing" className="hover:text-blue-600 transition-colors">Маркетинг</a>
              <a href="#solutions" className="hover:text-blue-600 transition-colors">Для кого</a>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden lg:flex items-center gap-2 text-xs text-gray-500 font-medium mr-2">
                <Phone className="w-3.5 h-3.5 text-blue-600" />
                <span className="hover:text-blue-600 transition-colors font-bold">+7 (812) 507-99-27 <span className="text-gray-400 font-normal">доб. 2</span></span>
              </div>
              <button 
                onClick={onLogin}
                className="text-sm font-bold text-gray-600 hover:text-blue-600 transition-colors cursor-pointer"
              >
                Войти
              </button>
              <button 
                onClick={onRegister}
                className="px-5 py-2.5 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all cursor-pointer"
              >
                Начать бесплатно
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 relative overflow-hidden">
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100/80 text-indigo-800 rounded-full text-xs font-black mb-8 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
            <span>Глобальное обновление: ERP 2.0 для мебельных фабрик и цехов</span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black text-gray-900 mb-6 tracking-tight leading-tight">
            Умный калькулятор & <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">
              ERP Мебельное производство
            </span>
          </h1>

          <p className="text-lg md:text-xl text-gray-500 max-w-3xl mx-auto mb-10 leading-relaxed">
            Единая цифровая экосистема: от быстрого расчета стоимости кухни в салоне до цехового контроля распила, выездного монтажа и сквозной синхронизации с Битрикс24.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={onRegister}
              className="w-full sm:w-auto px-10 py-4 bg-blue-600 text-white text-base font-black rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all flex items-center justify-center gap-2 group cursor-pointer"
            >
              Зарегистрироваться <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <a 
              href="#erp-module"
              className="w-full sm:w-auto px-10 py-4 bg-slate-900 text-white text-base font-black rounded-2xl border-2 border-slate-900 hover:bg-slate-800 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-slate-200"
            >
              <Factory className="w-5 h-5 text-amber-400" />
              <span>Обзор модуля ERP</span>
            </a>
          </div>
        </div>
      </section>

      {/* Basic Features Grid */}
      <section className="py-20 bg-gray-50" id="features">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">Всё необходимое для роста продаж</h2>
            <p className="text-gray-500">Профессиональный инструментарий для салонов, дизайнеров и производств</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl transition-all group">
              <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-600 group-hover:text-white transition-all">
                <Calculator className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Точный расчет сметы</h3>
              <p className="text-gray-500 leading-relaxed">
                Учитывайте всё: от ЛДСП и кромки до сложных механизмов и услуг. Гибкие настройки наценок, коэффициентов и налогов.
              </p>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl transition-all group">
              <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                <LayoutDashboard className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Управление проектами</h3>
              <p className="text-gray-500 leading-relaxed">
                Храните все расчеты в облаке. Отслеживайте статусы, прикрепляйте 3D-эскизы, спецификации и историю согласований.
              </p>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl transition-all group">
              <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-purple-600 group-hover:text-white transition-all">
                <Factory className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Связь с производством</h3>
              <p className="text-gray-500 leading-relaxed">
                Передавайте заказы напрямую в цех. Получайте актуальные прайс-листы и статусы готовности заказов в реальном времени.
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
          
          {/* Header Badge & Title */}
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-900/60 border border-indigo-700/60 text-indigo-300 text-xs font-black uppercase tracking-wider">
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
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-950 border border-emerald-800/80 text-emerald-400 font-black text-xs uppercase tracking-wider">
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
                      <span>Печать QR-команд для переключения статусов прямо на листах расскроя</span>
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
                      <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold uppercase">В работе</span>
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
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-indigo-950 border border-indigo-800/80 text-indigo-300 font-black text-xs uppercase tracking-wider">
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
                      <div className="px-2 py-1 bg-emerald-900 text-emerald-100 rounded text-[10px] font-bold">
                        ✍️ Подпись в базе
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
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-sky-950 border border-sky-800/80 text-sky-400 font-black text-xs uppercase tracking-wider">
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
                        <span className="px-2 py-0.5 rounded bg-sky-950 text-sky-300 font-bold">Готово к монтажу</span>
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
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-amber-950 border border-amber-800/80 text-amber-400 font-black text-xs uppercase tracking-wider">
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
                        <div>📁 photo_17105820_1.jpg (Фото собранного гарнитура)</div>
                        <div>📁 photo_17105820_2.jpg (Узел примыкания столешницы)</div>
                        <div>📁 photo_17105820_3.jpg (Подписанный Акт сдачи)</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* ERP Bottom CTA */}
          <div className="mt-12 text-center">
            <button
              onClick={onRegister}
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-sm rounded-2xl hover:from-blue-500 hover:to-indigo-500 shadow-xl shadow-indigo-600/30 transition-all cursor-pointer inline-flex items-center gap-2"
            >
              <span>Подключить модуль ERP для вашего производства</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      </section>

      {/* Smart Marketing Section */}
      <section className="py-20 bg-gradient-to-b from-white to-gray-50 border-t border-gray-100 overflow-hidden" id="marketing">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="flex-1 space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-full text-sm font-bold">
                <Sparkles className="w-4 h-4" />
                <span>Модуль: Маркетинг и Акции</span>
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
                    <Percent className="w-5 h-5 animate-pulse" />
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
                    <p className="text-sm text-gray-500">Автоматически выделяйте акционные позиции яркими стикерами в каталоге, привлекая внимание менеджеров при проектировании.</p>
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

            {/* Visual Phone/Tablet mockup of the promotion mechanism */}
            <div className="flex-1 w-full max-w-lg lg:max-w-none">
              <div className="bg-white rounded-3xl p-6 md:p-8 shadow-xl border border-gray-100 relative">
                <div className="absolute -top-3 -right-3 w-12 h-12 bg-yellow-400 text-yellow-900 rounded-full flex items-center justify-center font-bold text-lg rotate-12 shadow-lg z-10 animate-pulse">
                  %
                </div>
                
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
                    <span className="px-2.5 py-1 bg-green-100 text-green-800 text-[10px] font-bold rounded-full uppercase tracking-wider">Активна</span>
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
                    <span className="px-2.5 py-1 bg-green-100 text-green-800 text-[10px] font-bold rounded-full uppercase tracking-wider">Активна</span>
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
                    <span className="px-2.5 py-1 bg-gray-100 text-gray-600 text-[10px] font-bold rounded-full uppercase tracking-wider">Завершена</span>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-100 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-gray-400 block uppercase tracking-wider font-bold mb-1">Интеграция с расчетом</span>
                    <p className="text-sm font-semibold text-gray-700">Акции автоматически применяются в смете</p>
                  </div>
                  <div className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-100">
                    + Создать акцию
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Roles Section */}
      <section className="py-20" id="solutions">
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
                    <p className="text-sm text-gray-500">Управляйте заказами от салонов, настраивайте цеховой учет (QR) и контролируйте выездные монтажи.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <ShoppingBag className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">Мебельный салон</h4>
                    <p className="text-sm text-gray-500">Быстро считайте заказы клиентам, применяйте рекламные акции, отправляйте заявки в цех и ведите базу проектов.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">Частный дизайнер</h4>
                    <p className="text-sm text-gray-500">Профессиональный инструмент для точного расчета стоимости и спецификаций ваших идей.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex-1 bg-blue-600 rounded-[3rem] p-12 text-white relative overflow-hidden shadow-2xl shadow-blue-200">
              <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
              <div className="relative z-10">
                <h3 className="text-3xl font-bold mb-6">Готовы оптимизировать свой бизнес?</h3>
                <p className="text-blue-100 mb-8 text-lg">Присоединяйтесь к сотням профессионалов, которые уже используют экосистему Мебельный Калькулятор + ERP для роста своего бизнеса.</p>
                <button 
                  onClick={onRegister}
                  className="px-8 py-4 bg-white text-blue-600 font-black rounded-2xl hover:bg-blue-50 transition-all shadow-lg cursor-pointer"
                >
                  Попробовать бесплатно
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
              <Calculator className="text-white w-5 h-5" />
            </div>
            <span className="text-lg font-black text-gray-900 tracking-tight hidden sm:inline">Мебельный <span className="text-blue-600">калькулятор</span></span>
            <span className="text-lg font-black text-gray-900 tracking-tight sm:hidden">Калькулятор</span>
          </div>
          <p className="text-gray-400 text-sm">© 2026 Мебельный калькулятор & ERP Мебельное производство. Все права защищены.</p>
        </div>
      </footer>
    </div>
  );
};

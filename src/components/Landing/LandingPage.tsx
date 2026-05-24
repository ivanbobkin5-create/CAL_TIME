import React from 'react';
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
  Gift
} from 'lucide-react';
import { motion } from 'motion/react';

export const LandingPage = ({ onLogin, onRegister }: { onLogin: () => void, onRegister: () => void }) => {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
                <Calculator className="text-white w-6 h-6" />
              </div>
              <span className="text-xl font-black text-gray-900 tracking-tight hidden sm:inline">Мебельный <span className="text-blue-600">калькулятор</span></span>
              <span className="text-xl font-black text-gray-900 tracking-tight sm:hidden">Калькулятор</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-2 text-sm text-gray-500 font-medium mr-2">
                <Phone className="w-4 h-4" />
                <span className="hover:text-blue-600 transition-colors">+7 (812) 507-99-27 <span className="text-gray-400">доб. 2</span></span>
              </div>
              <button 
                onClick={onLogin}
                className="text-sm font-bold text-gray-600 hover:text-blue-600 transition-colors"
              >
                Войти
              </button>
              <button 
                onClick={onRegister}
                className="px-6 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all"
              >
                Начать бесплатно
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-bold mb-8 animate-bounce">
            <CheckCircle2 className="w-4 h-4" />
            Профессиональный инструмент для мебельщиков
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-gray-900 mb-6 tracking-tight leading-tight">
            Умный калькулятор для <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              мебельного бизнеса
            </span>
          </h1>
          <p className="text-xl text-gray-500 max-w-3xl mx-auto mb-10 leading-relaxed">
            Автоматизируйте расчеты, управляйте проектами и взаимодействуйте с производствами в единой экосистеме. От эскиза до готового изделия за считанные минуты.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={onRegister}
              className="w-full sm:w-auto px-10 py-4 bg-blue-600 text-white text-lg font-bold rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all flex items-center justify-center gap-2 group"
            >
              Зарегистрироваться <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button 
              onClick={onLogin}
              className="w-full sm:w-auto px-10 py-4 bg-white text-gray-900 text-lg font-bold rounded-2xl border-2 border-gray-100 hover:border-blue-200 transition-all"
            >
              У меня есть аккаунт
            </button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">Всё необходимое в одном месте</h2>
            <p className="text-gray-500">Мощные инструменты для каждого этапа вашего бизнеса</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl transition-all group">
              <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-600 group-hover:text-white transition-all">
                <Calculator className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Точный расчет</h3>
              <p className="text-gray-500 leading-relaxed">
                Учитывайте всё: от ЛДСП и кромки до фурнитуры и услуг. Гибкие настройки наценок и коэффициентов.
              </p>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl transition-all group">
              <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                <LayoutDashboard className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Управление проектами</h3>
              <p className="text-gray-500 leading-relaxed">
                Храните все расчеты в облаке. Отслеживайте статусы, прикрепляйте эскизы и спецификации.
              </p>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl transition-all group">
              <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-purple-600 group-hover:text-white transition-all">
                <Factory className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Связь с производством</h3>
              <p className="text-gray-500 leading-relaxed">
                Передавайте заказы напрямую на производство. Получайте актуальные цены и сроки в реальном времени.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Platform Power Section */}
      <section className="py-24 bg-gray-50" id="platform">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black text-gray-900 mb-6">Операционная система вашего мебельного дела</h2>
            <p className="text-xl text-gray-500 max-w-2xl mx-auto">От эскиза до отгрузки — всё в одном информационном поле.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="bento-grid">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              className="md:col-span-2 bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white"><Calculator className="w-6 h-6" /></div>
                <h3 className="text-2xl font-bold text-gray-900">Безошибочные расчеты</h3>
              </div>
              <p className="text-gray-600 text-lg">Автоматизация учета всех материалов и услуг. Исключите человеческий фактор: система мгновенно считает стоимость корпуса, фасадов, фурнитуры и работ.</p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="bg-gray-900 p-8 rounded-3xl text-white flex flex-col justify-between"
            >
              <h3 className="text-2xl font-bold mb-4">Единое поле работы</h3>
              <p className="text-gray-400">Производство и салоны работают в единой среде. Данные о расчетах мгновенно доступны всем участникам процесса.</p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100"
            >
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Bitrix24 Интеграция</h3>
              <p className="text-gray-600">Выгружайте готовые данные о сделках прямо в Bitrix24. Работайте в своей CRM, используя мощности нашей системы расчета.</p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="md:col-span-2 relative bg-blue-600 p-8 rounded-3xl text-white flex items-center justify-center group cursor-pointer"
            >
              <div className="absolute inset-0 bg-black/20 rounded-3xl group-hover:bg-black/10 transition-colors" />
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm group-hover:scale-105 transition-transform">
                  <div className="w-0 h-0 border-t-[12px] border-t-transparent border-l-[20px] border-l-white border-b-[12px] border-b-transparent ml-1" />
                </div>
                <div className="text-2xl font-bold">Посмотреть видео-обзор сервиса</div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Smart Marketing Section */}
      <section className="py-20 bg-gradient-to-b from-white to-gray-50 border-t border-gray-100 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="flex-1 space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-full text-sm font-bold">
                <Sparkles className="w-4 h-4" />
                <span>Новый модуль: Маркетинг и Акции</span>
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
      <section className="py-20">
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
                    <p className="text-sm text-gray-500">Управляйте заказами от салонов, настраивайте прайсы и контролируйте работу цеха.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <ShoppingBag className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">Мебельный салон</h4>
                    <p className="text-sm text-gray-500">Быстро считайте заказы клиентам, отправляйте заявки на производство и ведите базу проектов.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">Частный дизайнер</h4>
                    <p className="text-sm text-gray-500">Профессиональный инструмент для точного расчета стоимости ваших идей.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex-1 bg-blue-600 rounded-[3rem] p-12 text-white relative overflow-hidden shadow-2xl shadow-blue-200">
              <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
              <div className="relative z-10">
                <h3 className="text-3xl font-bold mb-6">Готовы оптимизировать свой бизнес?</h3>
                <p className="text-blue-100 mb-8 text-lg">Присоединяйтесь к сотням профессионалов, которые уже используют Мебельный Калькулятор для роста своего бизнеса.</p>
                <button 
                  onClick={onRegister}
                  className="px-8 py-4 bg-white text-blue-600 font-black rounded-2xl hover:bg-blue-50 transition-all shadow-lg"
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
          <p className="text-gray-400 text-sm">© 2026 Мебельный калькулятор. Все права защищены.</p>
        </div>
      </footer>
    </div>
  );
};

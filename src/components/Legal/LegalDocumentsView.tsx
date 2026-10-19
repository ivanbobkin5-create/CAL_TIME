import React, { useState, useRef } from 'react';
import { Download, Printer, ArrowLeft, Building } from 'lucide-react';

export const REQUISITES = {
  name: "Индивидуальный предприниматель Бобкин Иван Николаевич",
  shortName: "ИП Бобкин Иван Николаевич",
  inn: "510999506050",
  ogrnip: "326784700378458",
  domain: "mebel-plan.ru",
  account: "40802810120001208114",
  bankName: 'ООО "Банк Точка"',
  bankBik: "044525104",
  bankInn: "9721194461",
  bankCorrAccount: "30101810745374525104",
  bankAddress: "109044, Российская Федерация, г. Москва, вн.тер.г. муниципальный округ Южнопортовый, пер. 3-й Крутицкий, д.11, помещ. 7Н",
  email: "support@mebel-plan.ru",
};

interface LegalDocumentsViewProps {
  initialDoc?: 'terms' | 'privacy';
  onBack?: () => void;
}

export const LegalDocumentsView: React.FC<LegalDocumentsViewProps> = ({
  initialDoc = 'terms',
  onBack,
}) => {
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy'>(initialDoc);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!printRef.current) return;
    setIsGeneratingPdf(true);

    const docName = activeTab === 'terms' 
      ? 'Лицензионное_соглашение_mebel-plan_ru.pdf' 
      : 'Политика_конфиденциальности_mebel-plan_ru.pdf';

    const element = printRef.current;
    const opt = {
      margin: [10, 10, 10, 10],
      filename: docName,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    try {
      const html2pdfModule = await import('html2pdf.js');
      const html2pdf = html2pdfModule.default || html2pdfModule;
      await html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error("Ошибка при генерации PDF:", err);
      window.print();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans print:bg-white print:text-black">
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 py-3 sm:px-8 print:hidden shadow-sm">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
            {onBack ? (
              <button
                onClick={onBack}
                className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Назад
              </button>
            ) : (
              <a
                href="/"
                className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> В сервис
              </a>
            )}
            
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab('terms')}
                className={`px-3 py-1.5 text-xs sm:text-sm font-bold rounded-lg transition-all ${
                  activeTab === 'terms'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Лицензионное соглашение (mebel-plan.ru)
              </button>
              <button
                onClick={() => setActiveTab('privacy')}
                className={`px-3 py-1.5 text-xs sm:text-sm font-bold rounded-lg transition-all ${
                  activeTab === 'privacy'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Политика конфиденциальности (mebel-plan.ru)
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              title="Распечатать или сохранить в PDF через браузер"
            >
              <Printer className="w-4 h-4 text-slate-500" /> Печать
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 rounded-xl shadow-md shadow-blue-200 transition-all disabled:opacity-50"
            >
              {isGeneratingPdf ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              Скачать PDF
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto my-6 sm:my-10 p-6 sm:p-12 bg-white rounded-2xl shadow-xl border border-slate-200/80 print:shadow-none print:border-none print:p-0 print:m-0">
        <div ref={printRef} className="print-document prose max-w-none text-slate-800">
          
          <div className="border-b-2 border-slate-900 pb-4 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-2">
            <div>
              <div className="text-xs uppercase tracking-widest font-bold text-blue-700 mb-1">
                Официальные документы mebel-plan.ru
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 m-0">
                {activeTab === 'terms' ? 'ЛИЦЕНЗИОННОЕ СОГЛАШЕНИЕ (EULA)' : 'УСЛОВИЯ О КОНФИДЕНЦИАЛЬНОСТИ'}
              </h1>
              <p className="text-xs text-slate-500 m-0 mt-1">
                Правообладатель: {REQUISITES.shortName} (ИНН: {REQUISITES.inn}, ОГРНИП: {REQUISITES.ogrnip}, сайт: {REQUISITES.domain})
              </p>
            </div>
            <div className="text-right text-xs text-slate-500">
              <div>Дата редакции: 19 октября 2026 г.</div>
              <div>г. Москва, Российская Федерация</div>
            </div>
          </div>

          {activeTab === 'terms' ? (
            <div className="space-y-4">
<p className="mb-3 text-sm text-slate-700 leading-relaxed"></p>
<h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-1 mt-6 mb-3">ЛИЦЕНЗИОННОЕ СОГЛАШЕНИЕ</h3>
<p className="mb-3 text-sm text-slate-700 leading-relaxed">НА ИСПОЛЬЗОВАНИЕ ПРОГРАММЫ ДЛЯ ЭВМ «Мебель План» (mebel-plan.ru) Уважаемый Пользователь! Перед началом
установки, копирования либо иного использования ПО внимательно
ознакомьтесь с условиями настоящего Соглашения, являющегося стандартной формой
договора присоединения и заключаемого в письменной или иной форме, предусмотренной
действующим законодательством Российской Федерации. Если вы не согласны с
условиями настоящего Соглашения, вы не можете использовать ПО. Установка,
запуск или иное начало использования ПО означает Ваше полное согласие со всеми
условиями настоящего Соглашения и его надлежащее заключение в порядке,
предусмотренном в пункте 3 статьи 1286 Гражданского Кодекса Российской
Федерации. Настоящее Соглашение является юридически обязательным соглашением,
если Вы не согласны принять на себя его условия, Вы не имеете права
устанавливать ПО и должны удалить все его компоненты со своего портала
Битрикс24. Настоящее Лицензионное соглашение (далее – Соглашение)
заключается между Индивидуальный предприниматель Бобкин Иван Николаевич (ИП Бобкин И. Н., ИНН: 510999506050, ОГРНИП: 326784700378458, сайт: mebel-plan.ru) (далее – Лицензиар) и
Пользователем (любым физическим лицом, индивидуальным предпринимателем,
юридическим лицом (далее – Пользователь) Программы для ЭВМ «Мебель План» (mebel-plan.ru)
(далее – ПО). Основные термины настоящего Соглашения: ПО – программа для ЭВМ «Мебель План» (mebel-plan.ru) (как в целом,
так и ее компоненты), исключительные имущественные права на которую на
территории, определенной в п. 1.4. Соглашения, принадлежат Лицензиару; Демо -версия ПО – версия ПО «Мебель План» (mebel-plan.ru), в которой установлено ограничение по сроку ее использования и которая
предназначена исключительно для самостоятельного ознакомления Пользователем с
функциональными возможностями ПО на условиях настоящего Соглашения и не
предназначена для продажи или иного отчуждения третьим лицам.</p>
<h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-1 mt-6 mb-3">1. Предмет СОГЛАШЕНИЯ</h3>
<h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-1 mt-6 mb-3">1.1. В порядке и на условиях, предусмотренных настоящим
Соглашением, Лицензиар предоставляет Пользователю право использования ПО
(простая неисключительная лицензия), реализуемое путем установки (инсталляции)
и запуска Пользователем ПО в соответствии с его технической документацией и
условиями настоящего Соглашения.</h3>
<h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-1 mt-6 mb-3">1.2. Все положения настоящего Соглашения распространяются
как на ПО в целом, так и на его отдельные компоненты. ПО лицензируется как
единая программа для ЭВМ, его компоненты не могут быть разделены и
использоваться на разных порталах Битрикс24.</h3>
<h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-1 mt-6 mb-3">1.3. Настоящее Соглашение заключается до или непосредственно
в момент начала использования ПО и действует на протяжении всего срока действия
исключительного права Лицензиара на ПО, при условии надлежащего выполнения
Пользователем условий настоящего Соглашения.</h3>
<h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-1 mt-6 mb-3">1.4. Лицензиар предоставляет Пользователю право
использования ПО на территории Российской Федерации на условиях и в порядке,
предусмотренных действующим законодательством Российской Федерации и настоящим
Соглашением.</h3>
<h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-1 mt-6 mb-3">2. Авторские права</h3>
<h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-1 mt-6 mb-3">2.1. ПО является результатом интеллектуальной деятельности и
объектом авторских прав как программа для ЭВМ, которые регулируются и защищены
законодательством Российской Федерации об интеллектуальной собственности и
нормами международного права.</h3>
<h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-1 mt-6 mb-3">2.2. ПО содержит коммерческую тайну и иную конфиденциальную
информацию, принадлежащую Лицензиару. Любое использование ПО в нарушение
условий настоящего Соглашения рассматривается как нарушение прав Лицензиара и
является достаточным основанием для лишения Пользователя предоставленных по
настоящему Соглашению прав.</h3>
<h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-1 mt-6 mb-3">2.3. Лицензиар гарантирует, что обладает всеми правами
использования ПО, включая документацию к ней, необходимыми для предоставления
Пользователю прав на использование ПО</h3>
<p className="mb-3 text-sm text-slate-700 leading-relaxed">по настоящему
Соглашению.</p>
<h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-1 mt-6 mb-3">2.4. В случае нарушения авторских прав предусматривается
ответственность в соответствии с действующим законодательством Российской
Федерации.</h3>
<h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-1 mt-6 mb-3">3. Условия использования ПО и ограничения</h3>
<h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-1 mt-6 mb-3">3.1. Настоящее Соглашение предоставляет право установки
(инсталляции), запуска и использования законно приобретенной одной копии ПО в
рамках его функциональных возможностей на одном портале Битрикс24.</h3>
<h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-1 mt-6 mb-3">3.2. Пользователь имеет право, уведомив Лицензиара,
однократно уступить (передать) свои права и обязанности по настоящему
Соглашению другому Пользователю в полном объеме, кроме предусмотренного в
настоящем пункте Соглашения права последующей уступки (передачи) прав по
настоящему Соглашению другим Пользователям, что ограничивает возможность
повторной передачи прав по настоящему Соглашению. Указанная уступка (передача) прав
и обязанностей осуществляется при условии полного и безоговорочного согласия
нового пользователя со всеми положениями и условиями настоящего Соглашения.
Передавая права использования ПО, Пользователь обязуется полностью уничтожить
все копии ПО, установленные на компьютерах Пользователя, включая резервные
копии. Пользователь обязан предоставить полные данные нового Пользователя для
перерегистрации на него прав использования ПО в соответствии с настоящим
Соглашением.</h3>
<p className="mb-3 text-sm text-slate-700 leading-relaxed">Уступка (передача) прав по настоящему Соглашению не может
быть осуществлена (i) косвенно или через какое-либо третье лицо, а также ( ii ) в случае использования Пользователем Демо -версии ПО, в отношении которой устанавливается полный запрет отчуждения первоначальным
Пользователем.</p>
<h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-1 mt-6 mb-3">3.3. Пользователь вправе изменять, добавлять или удалять
любые файлы приобретенного ПО только в случаях, предусмотренных
Законодательством Российской Федерации об авторском праве.</h3>
<h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-1 mt-6 mb-3">3.4. Запрещается удалять любую информацию об авторских
правах.</h3>
<h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-1 mt-6 mb-3">3.5. Запрещается любое использование ПО, противоречащее
действующему законодательству Российской Федерации.</h3>
<h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-1 mt-6 mb-3">4. Ответственность сторон</h3>
<h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-1 mt-6 mb-3">4.1. За нарушение условий настоящего Соглашения наступает
ответственность, предусмотренная законодательством Российской Федерации.</h3>
<h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-1 mt-6 mb-3">4.2. Лицензиар не несет ответственности перед Пользователем
за любой ущерб, любую потерю прибыли, информации или сбережений, связанных с
использованием или с невозможностью использования ПО, даже в случае
предварительного уведомления со стороны Пользователя о возможности такого
ущерба, или по любому иску третьей стороны.</h3>
<h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-1 mt-6 mb-3">5. Ограниченная гарантия</h3>
<h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-1 mt-6 mb-3">5.1. Лицензиар предоставляет Пользователю право получения
Технической поддержки консультирования Пользователя по вопросам, связанным с
функциональностью ПО, особенностями установки и эксплуатации на стандартных
конфигурациях поддерживаемых (популярных) операционных, почтовых и иных систем
на условиях и в течение всего срока действия настоящего Соглашения, а также в
соответствии с действующим законодательством Российской Федерации без выплаты
дополнительного вознаграждения.</h3>
<h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-1 mt-6 mb-3">5.2. Все обновления ПО являются ее неотъемлемой частью и
используются исключительно вместе с ПО как единая программа для ЭВМ в порядке,
предусмотренном в настоящем Соглашении, если иные условия использования таких
обновлений не будут предусмотрены в отдельном лицензионном договоре.</h3>
<h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-1 mt-6 mb-3">5.3. Если при использовании ПО будут обнаружены ошибки,
Лицензиар обязуется исправить их в максимально короткие сроки и выпустить
новую, исправленную версию ПО. Стороны соглашаются, что точное определение
срока устранения ошибки не может быть установлено, так как ПО тесно
взаимодействует с другими программами для ЭВМ сторонних разработчиков,
операционной системой и аппаратными ресурсами компьютера Пользователя, и
работоспособность и время устранения проблем в полной мере не зависят только от
Лицензиара.</h3>
<h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-1 mt-6 mb-3">5.4. В случае несоблюдения любого из пунктов раздела 3
настоящего Соглашения, Пользователь автоматически теряет право на получение
обновлений (новых версий) ПО.</h3>
<h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-1 mt-6 mb-3">6. Действие, изменение и расторжение СОГЛАШЕНИЯ</h3>
<h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-1 mt-6 mb-3">6.1. Настоящее Соглашение заключено и подлежит толкованию в
соответствии с законодательством Российской Федерации.</h3>
<h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-1 mt-6 mb-3">6.2. В случае нарушения Пользователем условий настоящего
Соглашения по использованию ПО Лицензиар имеет право в одностороннем порядке
расторгнуть настоящее Соглашение, уведомив об этом Пользователя.</h3>
<h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-1 mt-6 mb-3">6.3. При расторжении настоящего Соглашения Пользователь
обязан прекратить использование ПО полностью и уничтожить все копии ПО,
установленные на своем портале Битрикс24, включая резервные копии и все
компоненты ПО.</h3>
<h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-1 mt-6 mb-3">6.4. Пользователь вправе расторгнуть настоящее Соглашение в
любое время, полностью удалив ПО.</h3>
<h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-1 mt-6 mb-3">6.5. В случае если компетентный суд признает какие-либо
положения настоящего Соглашения недействительными, Соглашение продолжает
действовать в остальной части.</h3>
<h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-1 mt-6 mb-3">6.6. Настоящее Соглашение также распространяется на все
обновления (новые версии) ПО, предоставляемые Пользователю в течение срока его
действия, если только при обновлении ПО Пользователю не будет предложено
ознакомиться и принять отдельный лицензионный договор или дополнения к
настоящему Соглашению.</h3>
<h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-1 mt-6 mb-3">7. Контактная информация Лицензиара</h3>
<p className="mb-3 text-sm text-slate-700 leading-relaxed">контактные данные</p>
            </div>
          ) : (
            <div className="space-y-4">
<p className="mb-3 text-sm text-slate-700 leading-relaxed">Условия о конфиденциальности персональной информации Индивидуальный предприниматель Бобкин Иван Николаевич (ИП Бобкин И. Н., ОГРНИП: 326784700378458, ИНН: 510999506050, сайт: mebel-plan.ru) (далее – ИП Бобкин И. Н. (mebel-plan.ru)) уважает право каждого человека на конфиденциальность. Для использования некоторых служб, программ и продуктов и сервисов mebel-plan.ru (далее — Продукты и Сервис mebel-plan.ru («Мебель План»)) может понадобиться прохождение процедуры регистрации или предоставление персональной информации ИП Бобкина И. Н. (mebel-plan.ru). Регистрация может понадобиться для доступа к некоторым функциям программ или участия в рекламных акциях. Условия о конфиденциальности содержат пояснения, как используется такая информация. Внимательно ознакомьтесь с настоящими Условиями о конфиденциальности и при необходимости задайте вопросы. Настоящие Условия о конфиденциальности регулируют отношения между ИП Бобкиным И. Н. (mebel-plan.ru) и любым физическим лицом, индивидуальным предпринимателем, юридическим лицом (далее – Пользователь) по обработке Персональной информации, включая, помимо прочего, сбор, использование, сохранение и безопасность предоставленной Пользователем и/или собранной у Пользователя информации. Действие настоящих Условий о конфиденциальности распространяются на всю информацию, которую ИП Бобкин И. Н. (mebel-plan.ru) и/или его аффилированные или иные уполномоченные лица, действующие от имени ИП Бобкина И. Н. (mebel-plan.ru), могут получить о Пользователе во время использования им любого из Продуктов и Сервиса mebel-plan.ru («Мебель План»). Обращаем Ваше внимание: использование Продуктов и Сервиса mebel-plan.ru («Мебель План») означает Ваше полное согласие со всеми положениями настоящих Условий о конфиденциальности и указанными в них условиями обработки Вашей персональной информации. Если Вы не согласны безоговорочно принять все положения настоящих Условий о конфиденциальности, Вы не имеете права использовать Продукты и Сервис mebel-plan.ru («Мебель План») и должны удалить все их компоненты со своего компьютера (ЭВМ).</p>
<h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-1 mt-6 mb-3">1. Персональная информация, собираемая и обрабатываемая ИП Бобкиным И. Н. (mebel-plan.ru) в рамках настоящих Условий о конфиденциальности</h3>
<p className="mb-3 text-sm text-slate-700 leading-relaxed">под персональной информацией понимается:</p>
<h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-1 mt-6 mb-3">1.1. Информация (включая, но не ограничиваясь, персональные данные), которую Пользователь самостоятельно предоставляет ИП Бобкина И. Н. (mebel-plan.ru) при осуществлении действий, направленных на регистрацию Продуктов и Сервиса mebel-plan.ru («Мебель План») (в</h3>
<p className="mb-3 text-sm text-slate-700 leading-relaxed">т.ч . активация) либо в рамках их использования (в т.ч . создание учетной записи, обращение в службу поддержки). Информация предоставляется путем заполнения Пользователем соответствующих форм, при этом объем предоставления информации при заполнении необязательных полей указанных форм определяется Пользователем самостоятельно.</p>
<h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-1 mt-6 mb-3">1.2. Информация, получаемая автоматически при использовании Продуктов и Сервиса mebel-plan.ru («Мебель План») Пользователем, в</h3>
<p className="mb-3 text-sm text-slate-700 leading-relaxed">т.ч . из cookies (при загрузке материалов сайта mebel-plan.ru, автоматически проверяются сведения о системе Пользователя; при использовании инструментов общения Пользователем, могут быть сохранены материалы и сообщения, которые он отправлял и получал, при этом ИП Бобкин И. Н. (mebel-plan.ru) оставляет за собой право проверять содержание общения Пользователя на своих сайтах).</p>
<h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-1 mt-6 mb-3">1.3. Пользовательские данные – любая информация загруженная (внесенная) Пользователем в Продукты и Сервис mebel-plan.ru («Мебель План»).</h3>
<h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-1 mt-6 mb-3">1.4. Иная информация о Пользователе, которую получает ИП Бобкин И. Н. (mebel-plan.ru) исключительно в указанных в разделе 2 настоящих Условий о конфиденциальности целях.</h3>
<h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-1 mt-6 mb-3">2. Цели сбора и обработки персональной информации пользователей</h3>
<p className="mb-3 text-sm text-slate-700 leading-relaxed">Сбор, хранение и обработка указанной в разделе 1 настоящих Условий о конфиденциальности информации осуществляется исключительно в следующих конкретных целях:</p>
<h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-1 mt-6 mb-3">2.1. Для идентификации Пользователя при использовании Продуктов и Сервиса mebel-plan.ru («Мебель План»);</h3>
<h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-1 mt-6 mb-3">2.2. Для персонализации учета посещений (в том числе с целью предоставления персонализированных услуг Пользователю) и регистрации действий Пользователя ИП Бобкин И. Н. (mebel-plan.ru) использует</h3>
<p className="mb-3 text-sm text-slate-700 leading-relaxed">Cookies .</p>
<h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-1 mt-6 mb-3">2.3. Для осуществления взаимодействия с Пользователем в рамках заключенных с ИП Бобкиным И. Н. (mebel-plan.ru) договоров или соглашений.</h3>
<h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-1 mt-6 mb-3">2.4. Для проведение статистических и иных исследований на основе обезличенных данных (в</h3>
<p className="mb-3 text-sm text-slate-700 leading-relaxed">т.ч . для выяснения мнения Пользователей о различных продуктах и услугах, оказываемых ИП Бобкиным И. Н. (mebel-plan.ru)).</p>
<h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-1 mt-6 mb-3">3. Условия обработки персональной информации пользователя и её передачи третьим лицам</h3>
<h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-1 mt-6 mb-3">3.1. Хранение (в том числе изменение и удаление) персональной информации Пользователей осуществляется в соответствии с функциональным назначением конкретных Продуктов и Сервиса mebel-plan.ru («Мебель План»), технической документацией к ним, а также Лицензионным соглашением на их использование.</h3>
<h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-1 mt-6 mb-3">3.2. Раскрытие персональной информации третьим лицам осуществляется следующих случаях:</h3>
<h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-1 mt-6 mb-3">3.2.1. Пользователь заблаговременно выразил свое согласие на такое раскрытие.</h3>
<h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-1 mt-6 mb-3">3.2.2. Передача необходима для исполнения договора, стороной которого либо выгодоприобретателем или</h3>
<p className="mb-3 text-sm text-slate-700 leading-relaxed">поручителем по которому является Пользователь, а также для заключения договора по инициативе Пользователя или договора, по которому Пользователь будет являться выгодоприобретателем или поручителем.</p>
<h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-1 mt-6 mb-3">3.2.3. Передача необходима для защиты прав и законных интересов ИП Бобкина И. Н. (mebel-plan.ru) или третьих лиц в случаях, когда Пользователь нарушает авторские права ИП Бобкина И. Н. (mebel-plan.ru) и/или соответствующее Лицензионное соглашение.</h3>
<h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-1 mt-6 mb-3">3.2.4. Передача необходима для осуществления правосудия, исполнения судебного акта, акта другого органа или должностного лица, подлежащих исполнению в соответствии с законодательством РФ об исполнительном производстве либо иных предусмотренных действующим законодательством РФ случаях.</h3>
<h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-1 mt-6 mb-3">3.3. При обработке персональных данных пользователей 1С-Битрикс руководствуется Федеральным законом РФ «О персональных данных».</h3>
<h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-1 mt-6 mb-3">4. Ограничения ответственности</h3>
<h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-1 mt-6 mb-3">4.1. ИП Бобкин И. Н. (mebel-plan.ru) не инициирует размещение персональной информации при использовании Продуктов и Сервиса mebel-plan.ru («Мебель План»), не контролирует ее достоверность и актуальность, однако ИП Бобкин И. Н. (mebel-plan.ru) оставляет за собой право требовать подтверждения достоверности переданной ему информации Пользователем.</h3>
<h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-1 mt-6 mb-3">4.2. При размещении (предоставлении ИП Бобкина И. Н. (mebel-plan.ru)) персональной информации третьих лиц Пользователь гарантирует, что получил все необходимые разрешения и согласия на указанные действия, а также гарантирует полное и безоговорочное согласие этих лиц со всеми положениями настоящих Условий о конфиденциальности.</h3>
<h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-1 mt-6 mb-3">4.3. ИП Бобкин И. Н. (mebel-plan.ru) не может сохранить конфиденциальность персональной информации Пользователя, публичный доступ к которой предоставлен самим Пользователем в силу функциональных назначений соответствующего Продукта mebel-plan.ru («Мебель План»); Пользователь соглашается с тем, что при использовании таких Продуктов определённая часть его персональной информации становится доступной для неограниченного круга лиц.</h3>
<h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-1 mt-6 mb-3">5. Защита персональной информации</h3>
<p className="mb-3 text-sm text-slate-700 leading-relaxed">ИП Бобкин И. Н. (mebel-plan.ru) принимает необходимые правовые, организационные и технические меры или обеспечивает их принятие для защиты персональной информации от неправомерного или случайного доступа к ней, уничтожения, изменения, блокирования, копирования, предоставления, распространения персональной информации, а также от иных неправомерных действий в отношении персональной информации, в том числе: · Использует RSA-шифрование в Продуктах ИП Бобкина И. Н. (mebel-plan.ru). · Предоставляет при необходимости двухэтапную аутентификацию для доступа к учетной записи. · Осуществляет защиту авторизованных сессий. · Постоянно совершенствует способы сбора, хранения и обработки данных.</p>
<h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-1 mt-6 mb-3">6. Заключительные положения</h3>
<p className="mb-3 text-sm text-slate-700 leading-relaxed">Настоящие Условия о конфиденциальности могут быть изменены ИП Бобкиным И. Н. (mebel-plan.ru) в одностороннем порядке путем размещения их новой редакции в сети Интернет по адресу https ://.../ privacy.php . В случае расхождения Условий о конфиденциальности с положениями Лицензионного соглашения с Пользователем, преимущественную силу имеет Лицензионное соглашение.</p>
<h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-1 mt-6 mb-3">7. Контактная информация</h3>
<p className="mb-3 text-sm text-slate-700 leading-relaxed">Контактная информация</p>
            </div>
          )}

          <div className="mt-10 pt-6 border-t-2 border-slate-900 break-inside-avoid">
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Building className="w-5 h-5 text-blue-700" /> РЕКВИЗИТЫ ПРАВООБЛАДАТЕЛЯ И АДРЕС ДЛЯ СВЯЗИ
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <div className="font-bold text-slate-900 mb-1">{REQUISITES.name}</div>
                <div><strong>ИНН:</strong> {REQUISITES.inn}</div>
                <div><strong>ОГРНИП:</strong> {REQUISITES.ogrnip}</div>
                <div><strong>Официальный сайт:</strong> https://{REQUISITES.domain}</div>
                <div><strong>E-mail поддержки:</strong> {REQUISITES.email}</div>
              </div>

              <div>
                <div className="font-bold text-slate-900 mb-1">Банковские реквизиты:</div>
                <div><strong>Банк:</strong> {REQUISITES.bankName}</div>
                <div><strong>Расчётный счёт:</strong> {REQUISITES.account}</div>
                <div><strong>БИК банка:</strong> {REQUISITES.bankBik}</div>
                <div><strong>ИНН банка:</strong> {REQUISITES.bankInn}</div>
                <div><strong>Корр. счёт:</strong> {REQUISITES.bankCorrAccount}</div>
                <div className="mt-1 text-[11px] text-slate-500">
                  <strong>Адрес банка:</strong> {REQUISITES.bankAddress}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

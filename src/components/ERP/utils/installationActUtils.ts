import { 
  InstallationActSettings, 
  ExtraWorksTariffVersion, 
  InstallationTask, 
  ERPCompanySettings,
  ExtraWorkItem
} from '../types';

export const DEFAULT_EXTRA_WORKS_V1: ExtraWorkItem[] = [
  // Вентиляция
  { id: 'ew-vent-1', name: 'Монтаж вентиляционного канала вытяжки из гофры / пластика', unit: 'м.п.', price: 650 },
  { id: 'ew-vent-2', name: 'Установка вытяжки встройка/врезка/купольная с подключением', unit: 'шт', price: 2000 },
  { id: 'ew-vent-3', name: 'Пропил под вентиляционный канал', unit: 'шт', price: 300 },
  { id: 'ew-vent-4', name: 'Герметизация соединения пластиковых каналов', unit: 'соед.', price: 100 },

  // Сборка мебели
  { id: 'ew-mob-1', name: 'Монтаж горизонтальной профильной системы «Профиль Gola»', unit: 'м.п.', price: 300 },
  { id: 'ew-mob-2', name: 'Монтаж вертикальной профильной системы «Профиль Gola»', unit: 'м.п.', price: 500 },
  { id: 'ew-mob-3', name: 'Распил профиля GOLA 45 градусов', unit: 'шт', price: 400 },
  { id: 'ew-mob-4', name: 'Распил GOLA профиля, прямой рез', unit: 'шт', price: 300 },
  { id: 'ew-mob-5', name: 'Изменение (упил) глубины модуля / модуля с ящиками', unit: 'модуль', price: 1200 },
  { id: 'ew-mob-6', name: 'Пропилы под газовые трубы, отопление, водоснабжение', unit: 'шт', price: 300 },
  { id: 'ew-mob-7', name: 'Вырез отверстия под выключатель или розетку', unit: 'шт', price: 250 },
  { id: 'ew-mob-8', name: 'Вырез отверстия в пластиковом цоколе под вентрешетку', unit: 'шт', price: 300 },
  { id: 'ew-mob-9', name: 'Вырез отверстия в цоколе ЛДСП/МДФ под вентрешетку', unit: 'шт', price: 1000 },
  { id: 'ew-mob-10', name: 'Демонтаж / монтаж плинтуса в помещении', unit: 'м.п.', price: 200 },
  { id: 'ew-mob-11', name: 'Монтаж и сборка карнизов мебели без фрезеровки', unit: 'м.п.', price: 500 },
  { id: 'ew-mob-12', name: 'Монтаж и сборка карнизов мебели с фрезеровкой', unit: 'м.п.', price: 1000 },
  { id: 'ew-mob-13', name: 'Распил карнизов с фрезеровкой под 45 градусов', unit: 'рез', price: 1000 },
  { id: 'ew-mob-14', name: 'Закрепление карниза к потолку для натяжного потолка', unit: 'м.п.', price: 500 },
  { id: 'ew-mob-15', name: 'Фрезеровка фальшпанели под геометрию стены', unit: 'м.п.', price: 1500 },

  // Сантехника
  { id: 'ew-san-1', name: 'Мойка – Установка с применением герметизирующих средств', unit: 'шт', price: 1000 },
  { id: 'ew-san-2', name: 'Сборка фитингов и кранов перекрытия (со льном / герметиком)', unit: 'услуга', price: 1500 },
  { id: 'ew-san-3', name: 'Смеситель – Установка и подключение к коммуникациям', unit: 'шт', price: 2000 },
  { id: 'ew-san-4', name: 'Сливное оборудование (сифон) – Установка и подключение', unit: 'шт', price: 800 },
  { id: 'ew-san-5', name: 'Установка комплекта посудосушителя в верхний/нижний шкаф', unit: 'шт', price: 1000 },
  { id: 'ew-san-6', name: 'Измельчитель – Установка и подключение', unit: 'шт', price: 2500 },
  { id: 'ew-san-7', name: 'Посудомоечная машина встраиваемая – Установка и подкл.', unit: 'шт', price: 1500 },
  { id: 'ew-san-8', name: 'Посудомоечная машина НЕ встраиваемая – Установка и подкл.', unit: 'шт', price: 1000 },
  { id: 'ew-san-9', name: 'Стиральная машина встраиваемая – Установка и подкл.', unit: 'шт', price: 1500 },
  { id: 'ew-san-10', name: 'Стиральная машина НЕ встраиваемая – Установка и подкл.', unit: 'шт', price: 1000 },
  { id: 'ew-san-11', name: 'Установка дозатора для моющих средств в мойку/столешницу', unit: 'шт', price: 500 },
  { id: 'ew-san-12', name: 'Подключение и монтаж фильтра для питьевой воды', unit: 'шт', price: 1000 },
  { id: 'ew-san-13', name: 'Вырез отверстия в мойке из искуссв. камня/нержавейки', unit: 'шт', price: 1000 },

  // Обработка столешниц и стеновых панелей
  { id: 'ew-st-1', name: 'Установка ЛДСП столешницы Заказчика', unit: 'м.п.', price: 1000 },
  { id: 'ew-st-2', name: 'Установка стеновой панели Заказчика', unit: 'м.п.', price: 800 },
  { id: 'ew-st-3', name: 'Прямолинейный распил ЛДСП столешницы глубиной 600 мм', unit: 'рез', price: 500 },
  { id: 'ew-st-4', name: 'Прямолинейный распил ЛДСП столешницы глубиной 900 мм', unit: 'рез', price: 800 },
  { id: 'ew-st-5', name: 'Вырез отверстия в столешнице под трубы', unit: 'шт', price: 300 },
  { id: 'ew-st-6', name: 'Вырез отверстия в стеновой панели под розетки', unit: 'шт', price: 300 },
  { id: 'ew-st-7', name: 'Продольный разрез столешницы (уменьшение глубины)', unit: 'м.п.', price: 500 },
  { id: 'ew-st-8', name: 'Распил столешницы под геометрию стены (развернутый угол)', unit: 'шт', price: 500 },
  { id: 'ew-st-9', name: 'Вырезы и фрезеровка мебельного подоконника', unit: 'шт', price: 5000 },
  { id: 'ew-st-10', name: 'Вырезы и фрезеровка мебельного откоса', unit: 'шт', price: 1500 },
  { id: 'ew-st-11', name: 'Монтаж мебельного подоконника', unit: 'м.п.', price: 1500 },
  { id: 'ew-st-12', name: 'Монтаж мебельных откосов', unit: 'м.п.', price: 1000 },
  { id: 'ew-st-13', name: 'Беспланочное соединение столешниц «Еврозапил»', unit: 'шт', price: 9000 },
  { id: 'ew-st-14', name: 'Вырез в столешнице под мойку / варочную панель', unit: 'шт', price: 1000 },
  { id: 'ew-st-15', name: 'Вырез в столешнице под блок розеток / заглушку', unit: 'шт', price: 500 },
  { id: 'ew-st-16', name: 'Отверстие в столешнице под смеситель/дозатор', unit: 'шт', price: 300 },
  { id: 'ew-st-17', name: 'Прямолинейное / криволинейное кромление столешниц', unit: 'м.п.', price: 650 },
  { id: 'ew-st-18', name: 'Прямой распил стеновой панели высотой 600 мм', unit: 'рез', price: 300 },
  { id: 'ew-st-19', name: 'Продольный распил стеновой панели', unit: 'м.п.', price: 300 },
  { id: 'ew-st-20', name: 'Стеновая панель – Установка без планок и плинтуса', unit: 'м.п.', price: 1500 },
  { id: 'ew-st-21', name: 'Стеновая панель – Формирование внутреннего угла', unit: 'шт', price: 500 },
  { id: 'ew-st-22', name: 'Вырез отверстия в стеновой панели под выключатель/розетку', unit: 'шт', price: 250 },

  // Мебельная фурнитура
  { id: 'ew-f-1', name: 'Установка ручек / фурнитуры / газлифтов (не из спецификации)', unit: 'шт', price: 100 },
  { id: 'ew-f-2', name: 'Установка петель Заказчика (не из спецификации)', unit: 'шт', price: 50 },
  { id: 'ew-f-3', name: 'Монтаж рейлинга на стеновую панель/плитку', unit: 'м.п.', price: 1500 },
  { id: 'ew-f-4', name: 'Монтаж Бутылочницы / Ведра / Кронштейна ТВ / Брючницы', unit: 'шт', price: 1000 },
  { id: 'ew-f-5', name: 'Монтаж механизма «Выдвижная колонна» / Волшебный уголок', unit: 'шт', price: 4000 },
  { id: 'ew-f-6', name: 'Монтаж и разметка комплекта направляющих Заказчика', unit: 'шт', price: 700 },
  { id: 'ew-f-7', name: 'Монтаж механизма подъема фасадов', unit: 'шт', price: 1500 },
  { id: 'ew-f-8', name: 'Монтаж подъемного механизма складывания двух фасадов', unit: 'шт', price: 2500 },

  // Подсветка и бытовая техника
  { id: 'ew-led-1', name: 'Демонтаж / монтаж розетки или выключателя', unit: 'шт', price: 450 },
  { id: 'ew-led-2', name: 'Монтаж светодиодной ленты с подключением к электросети', unit: 'м.п.', price: 500 },
  { id: 'ew-led-3', name: 'Монтаж угловой/накладного профиля для светодиодной ленты', unit: 'м.п.', price: 300 },
  { id: 'ew-led-4', name: 'Монтаж врезного алюминиевого профиля с вклейкой', unit: 'м.п.', price: 500 },
  { id: 'ew-led-5', name: 'Монтаж сенсорной кнопки включения светодиодной ленты', unit: 'шт', price: 1000 },
  { id: 'ew-led-6', name: 'Монтаж провода для светодиодной ленты', unit: 'м.п.', price: 100 },
  { id: 'ew-led-7', name: 'Фрезеровка паза под скрытый монтаж провода', unit: 'м.п.', price: 500 },
  { id: 'ew-led-8', name: 'Монтаж механической кнопки включения светодиодной ленты', unit: 'шт', price: 800 },
  { id: 'ew-led-9', name: 'Фрезеровка под врезной профиль подсветки и его вклейка', unit: 'м.п.', price: 800 },
  { id: 'ew-led-10', name: 'Установка эл. варочной панели с подключением', unit: 'шт', price: 1000 },
  { id: 'ew-led-11', name: 'Установка электрической отдельно стоящей плиты', unit: 'шт', price: 500 },
  { id: 'ew-led-12', name: 'Установка электрического духового шкафа', unit: 'шт', price: 1000 },
  { id: 'ew-led-13', name: 'Установка встраиваемой микроволновой печи', unit: 'шт', price: 1500 },
  { id: 'ew-led-14', name: 'Установка холодильника в пенал с навеской фасадов', unit: 'шт', price: 3500 },
  { id: 'ew-led-15', name: 'Установка не встраиваемого холодильника', unit: 'шт', price: 500 },
  { id: 'ew-led-16', name: 'Изменение стороны открывания дверей холодильника', unit: 'шт', price: 1500 },

  // Прочие работы
  { id: 'ew-etc-1', name: 'Дополнительный выезд сотрудника (ложный выезд)', unit: 'выезд', price: 3000 },
  { id: 'ew-etc-2', name: 'Дополнительные затраты на выезд за КАД', unit: '1 км.', price: 25 },
  { id: 'ew-etc-3', name: 'Выезд за необходимым материалом', unit: 'услуга', price: 1000 }
];

export const DEFAULT_EXTRA_WORKS_V2: ExtraWorkItem[] = DEFAULT_EXTRA_WORKS_V1.map(item => ({
  ...item,
  price: Math.round(item.price * 1.1) // 10% повышение с июля
}));

export const DEFAULT_EXTRA_WORKS_V3: ExtraWorkItem[] = DEFAULT_EXTRA_WORKS_V1.map(item => ({
  ...item,
  price: Math.round(item.price * 1.2) // 20% повышение с сентября
}));

export const DEFAULT_INSTALLATION_ACT_SETTINGS: InstallationActSettings = {
  warrantyYears: 2,
  actHeaderTitle: 'АКТ ПРИЕМА-ПЕРЕДАЧИ ВЫПОЛНЕННЫХ РАБОТ ПО СБОРКЕ И МОНТАЖУ МЕБЕЛИ',
  actTextIntro: 'Исполнитель в лице сборщика мебели {installerName} сдал, а Заказчик {clientName} принял выполненные работы по доставке, сборке и монтажу кухонного гарнитура / мебели по Заказу №{orderNumber}.',
  actTermsText: 'Заказчик подтверждает, что работы выполнены в полном объеме, качеством выполненных работ и внешним видом изделия удовлетворен, претензий к комплектности не имеет.\n\nГарантийный срок на собранную мебель составляет {warrantyYears} года с момента подписания настоящего Акта и действует до {warrantyUntil}. По вопросам гарантийного обслуживания обращаться в сервисную службу по тел: {servicePhone}.',
  servicePhone: '+7 (800) 555-35-35',
  tariffVersions: [
    {
      id: 'tariff-2026-06-01',
      versionName: 'Прайс-лист от 01.06.2026',
      effectiveFrom: '2026-06-01',
      items: DEFAULT_EXTRA_WORKS_V1
    },
    {
      id: 'tariff-2026-07-01',
      versionName: 'Прайс-лист от 01.07.2026',
      effectiveFrom: '2026-07-01',
      items: DEFAULT_EXTRA_WORKS_V2
    },
    {
      id: 'tariff-2026-09-01',
      versionName: 'Прайс-лист от 01.09.2026',
      effectiveFrom: '2026-09-01',
      items: DEFAULT_EXTRA_WORKS_V3
    }
  ]
};

/**
 * Возвращает актуальную версию прайс-листа дополнительных работ
 * на дату договора или создания заказа
 */
export function getEffectiveTariffVersion(
  actSettings?: InstallationActSettings,
  contractDateOrCreatedAt?: string
): ExtraWorksTariffVersion {
  const settings = actSettings || DEFAULT_INSTALLATION_ACT_SETTINGS;
  const versions = settings.tariffVersions || DEFAULT_INSTALLATION_ACT_SETTINGS.tariffVersions;

  if (!versions || versions.length === 0) {
    return DEFAULT_INSTALLATION_ACT_SETTINGS.tariffVersions[0];
  }

  // Sort versions by effectiveFrom ascending
  const sorted = [...versions].sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));

  const targetDate = contractDateOrCreatedAt ? contractDateOrCreatedAt.split('T')[0] : new Date().toISOString().split('T')[0];

  // Find the latest version whose effectiveFrom <= targetDate
  let matchedVersion = sorted[0];
  for (const v of sorted) {
    if (v.effectiveFrom <= targetDate) {
      matchedVersion = v;
    } else {
      break;
    }
  }

  return matchedVersion;
}

/**
 * Рассчитывает дату окончания гарантии
 */
export function calculateWarrantyDate(completedDateStr?: string, warrantyYears: number = 2): string {
  const baseDate = completedDateStr ? new Date(completedDateStr) : new Date();
  if (isNaN(baseDate.getTime())) return '';

  const endDate = new Date(baseDate);
  endDate.setFullYear(endDate.getFullYear() + (warrantyYears || 2));

  const day = String(endDate.getDate()).padStart(2, '0');
  const month = String(endDate.getMonth() + 1).padStart(2, '0');
  const year = endDate.getFullYear();

  return `${day}.${month}.${year}`;
}

/**
 * Форматирует дату YYYY-MM-DD -> DD.MM.YYYY
 */
export function formatDateRu(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

/**
 * Генерирует итоговый текст Акта с подстановкой переменных
 */
export function generateActFullText(
  task: InstallationTask,
  actSettings?: InstallationActSettings,
  companyName?: string
): { introText: string; termsText: string; warrantyUntilFormatted: string } {
  const settings = actSettings || DEFAULT_INSTALLATION_ACT_SETTINGS;
  const completedDate = task.completedDate || new Date().toISOString().split('T')[0];
  const warrantyYears = settings.warrantyYears || 2;
  const warrantyUntilFormatted = calculateWarrantyDate(completedDate, warrantyYears);

  const assemblyPrice = task.assemblyPrice || 0;
  const extraWorksTotal = task.extraWorksTotal || 0;
  const grandTotal = assemblyPrice + extraWorksTotal;

  const replacements: Record<string, string> = {
    '{orderNumber}': task.orderNumber || 'б/н',
    '{clientName}': task.clientName || 'Заказчик',
    '{clientPhone}': task.clientPhone || '',
    '{address}': task.address || '',
    '{installerName}': task.installerEmployeeName || 'Сборщик мебели',
    '{date}': formatDateRu(completedDate),
    '{warrantyYears}': String(warrantyYears),
    '{warrantyUntil}': warrantyUntilFormatted,
    '{assemblyPrice}': `${assemblyPrice.toLocaleString('ru-RU')} ₽`,
    '{extraWorksTotal}': `${extraWorksTotal.toLocaleString('ru-RU')} ₽`,
    '{grandTotal}': `${grandTotal.toLocaleString('ru-RU')} ₽`,
    '{servicePhone}': settings.servicePhone || '+7 (800) 555-35-35',
    '{companyName}': companyName || 'Мебельное производство'
  };

  let introText = settings.actTextIntro || DEFAULT_INSTALLATION_ACT_SETTINGS.actTextIntro;
  let termsText = settings.actTermsText || DEFAULT_INSTALLATION_ACT_SETTINGS.actTermsText;

  Object.entries(replacements).forEach(([key, val]) => {
    introText = introText.split(key).join(val);
    termsText = termsText.split(key).join(val);
  });

  return {
    introText,
    termsText,
    warrantyUntilFormatted
  };
}

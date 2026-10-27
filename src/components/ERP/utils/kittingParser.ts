import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { smartDecodeFile } from '../../../utils/fileEncodingDetector';
import { OrderHardwareItem } from '../types';

export interface HardwareParseResult {
  fileName: string;
  fileSize: number;
  uploadedAt: string;
  items: OrderHardwareItem[];
  totalItemsCount: number;
  totalQuantity: number;
  categoriesSummary: Array<{ category: string; count: number; totalQuantity: number }>;
  rawTextPreview?: string;
}

// Default recognized aliases for Hardware columns in Excel / CSV / TSV
export const DEFAULT_HARDWARE_COLUMN_MAPPING: Record<string, string[]> = {
  article: [
    'арт', 'артикул', 'код', 'код товара', 'номенклатурный номер', 'article', 'code', 'art_no', 'item_code', 'код номенклатуры'
  ],
  name: [
    'наименование', 'название', 'номенклатура', 'товар', 'фурнитура', 'позиция', 'элемент', 'комплектующие', 'name', 'item', 'description', 'материал/фурнитура'
  ],
  quantity: [
    'кол', 'количество', 'кол-во', 'к-во', 'qty', 'count', 'число', 'потребность', 'кол-во в заказе', 'кол-во факт', 'кол-во шт'
  ],
  unit: [
    'ед', 'ед. изм.', 'ед.изм', 'ед.изм.', 'ед_изм', 'ед изм', 'unit', 'единица', 'базовая единица'
  ],
  category: [
    'группа', 'категория', 'тип', 'раздел', 'вид', 'category', 'group', 'группа номенклатуры', 'вид фурнитуры'
  ],
  notes: [
    'примеч', 'примечание', 'коммент', 'комментарий', 'производитель', 'бренд', 'note', 'brand', 'поставщик', 'папка', 'узел'
  ]
};

// Automatic categorization keywords when category is not explicitly provided in the file
export const HARDWARE_CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Петли и доводчики': [
    'петл', 'петля', 'доводчик', 'clip-top', 'clip top', 'blumotion', 'sensys', 'intermat', 'интермат', 'петли', 'ответная планка', 'планка под петлю'
  ],
  'Направляющие и ящики': [
    'направляющ', 'тандем', 'tandem', 'legrabox', 'antaro', 'merivobox', 'квадро', 'quadro', 'шариков', 'роликов', 'метабокс', 'боярд', 'ящик', 'боковина ящика', 'царга', 'направляющие', 'тандембокс'
  ],
  'Подъемные механизмы': [
    'aventos', 'авентос', 'подъемник', 'газлифт', 'газовый лифт', 'лифт фасада', 'механизм подъема', 'hf', 'hk', 'hl', 'hs', 'top'
  ],
  'Крепеж и метизы': [
    'конфирмат', 'евровинт', 'стяжк', 'эксцентрик', 'шкант', 'саморез', 'винт', 'болт', 'гайка', 'шайба', 'уголок', 'дюбель', 'минификс', 'рафикс', 'шуруп', 'шканты', 'стяжка'
  ],
  'Лицевая фурнитура': [
    'ручк', 'ручка', 'кнопк', 'скоб', 'рейлинг', 'профиль-ручка', 'gola', 'гола', 'крючок', 'замок', 'ручки', 'кнопка'
  ],
  'Опоры и цоколи': [
    'опор', 'опора', 'ножк', 'ножка', 'подпятник', 'цокол', 'цоколь', 'клипс', 'подпят', 'нога', 'опоры'
  ],
  'Раздвижные системы': [
    'купе', 'раздвижн', 'ролик верх', 'ролик нижн', 'направляющ верх', 'направляющ нижн', 'шлегель', 'стопор', 'доводчик купе', 'система купе'
  ],
  'Наполнение и аксессуары': [
    'сушк', 'сушка', 'бутылочниц', 'карго', 'корзин', 'лоток', 'ведро', 'мусорн', 'брючниц', 'пантограф', 'штанга', 'держатель штанги', 'посудосушитель'
  ],
  'Подсветка и электрика': [
    'лент', 'led', 'блок питан', 'трансформатор', 'выключател', 'датчик', 'профиль led', 'рассеивател', 'провод', 'кабель', 'светильник', 'подсветка'
  ],
  'Заглушки и уплотнители': [
    'заглушк', 'заглушка', 'наклейк', 'уплотнитель', 'демпфер', 'амортизатор', 'отбойник', 'бампер'
  ]
};

// Patterns to detect sheet board materials, edging, facades, countertops
const SHEET_AND_FACADE_PATTERNS = [
  /кромк/i,
  /лдсп/i,
  /дсп/i,
  /хдф/i,
  /двп/i,
  /мдф/i,
  /фасад/i,
  /фанера/i,
  /столешниц/i,
  /стеновая/i,
  /плита/i,
  /стекло/i,
  /зеркало/i,
  /профиль.*ал/i,
  /аллюминий|алюминий/i
];

export interface HardwareParseResult {
  fileName: string;
  fileSize: number;
  uploadedAt: string;
  items: OrderHardwareItem[];
  detectedMaterials: OrderHardwareItem[]; // Найденные листовые материалы, фасады и кромка для выбора пользователем
  totalItemsCount: number;
  totalQuantity: number;
  categoriesSummary: Array<{ category: string; count: number; totalQuantity: number }>;
  rawTextPreview?: string;
}

export function detectCategoryByName(name: string, fallbackCategory: string = 'Разное / Крепеж'): string {
  const lower = name.toLowerCase();
  if (/фасад/i.test(lower)) {
    return 'Фасады и двери';
  }
  if (/кромк/i.test(lower)) {
    return 'Кромка и облицовка';
  }
  if (/лдсп|дсп|хдф|двп|мдф|фанера|столешниц|стеновая/i.test(lower)) {
    return 'Материалы и плиты';
  }
  for (const [catName, keywords] of Object.entries(HARDWARE_CATEGORY_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        return catName;
      }
    }
  }
  return fallbackCategory;
}

export function isMaterialOrFacadeItem(
  name: string,
  excludeKeywords?: string[],
  reviewKeywords?: string[],
  article?: string
): boolean {
  // 1. If item has a specific SKU / Article number, it's a specific product/hardware item, NOT a raw sheet material
  if (article && article.trim().length > 0) {
    return false;
  }

  const lower = name.toLowerCase();

  // 2. Explicit hardware / fittings terms that should ALWAYS be treated as hardware, even if they mention "фасад", "дверь", "стекло" etc.
  const HARDWARE_FITTINGS_TERMS = [
    'толкатель', 'нажимной', 'выталкиватель', 'петл', 'стяжк', 'крепеж', 'уголок', 'ручк', 'доводчик',
    'защелк', 'механизм', 'подъемник', 'направляющ', 'опор', 'держатель', 'амортизатор',
    'демпфер', 'клипс', 'фиксатор', 'заглушк', 'эксцентрик', 'евровинт', 'конфирмат',
    'подвес', 'навес', 'трафарет', 'адаптер', 'соединитель', 'крючок', 'замок'
  ];

  if (HARDWARE_FITTINGS_TERMS.some(term => lower.includes(term))) {
    return false;
  }

  // 3. Check custom review keywords configured in settings (e.g. Двери, Купе, Стекло, Двери RIAL, Зеркало, Фасады)
  if (reviewKeywords && reviewKeywords.length > 0) {
    if (reviewKeywords.some(kw => kw && kw.trim() && lower.includes(kw.toLowerCase().trim()))) {
      return true;
    }
  }

  // 4. Check custom exclude keywords
  if (excludeKeywords && excludeKeywords.length > 0) {
    if (excludeKeywords.some(kw => kw && kw.trim() && lower.includes(kw.toLowerCase().trim()))) {
      return true;
    }
  }

  // 5. Fallback built-in patterns
  return SHEET_AND_FACADE_PATTERNS.some(pat => pat.test(lower));
}

export function isExcludedSheetMaterial(name: string): boolean {
  return isMaterialOrFacadeItem(name);
}

/**
 * Main parser for Hardware / Kitting manifest file
 */
export async function parseHardwareFile(
  file: File,
  customMapping?: Record<string, string[]>,
  excludeKeywords?: string[],
  reviewKeywords?: string[]
): Promise<HardwareParseResult> {
  const mapping = { ...DEFAULT_HARDWARE_COLUMN_MAPPING, ...(customMapping || {}) };
  const fileName = file.name;
  const fileSize = file.size;
  const ext = fileName.split('.').pop()?.toLowerCase() || '';

  const buffer = await file.arrayBuffer();
  const uint8 = new Uint8Array(buffer);

  let rawItems: Array<{
    article?: string;
    name: string;
    quantity: number;
    unit?: string;
    category?: string;
    notes?: string;
  }> = [];

  let rawTextPreview = '';

  // 1. Process Excel files (.xlsx, .xls, .xlsm, .xlsb)
  if (['xlsx', 'xls', 'xlsm', 'xlsb'].includes(ext)) {
    try {
      const workbook = XLSX.read(uint8, { type: 'array', cellDates: true });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

      rawTextPreview = rows.slice(0, 15).map(r => r.join('\t')).join('\n');
      rawItems = parseTableRows(rows, mapping);
    } catch (e) {
      console.warn('Excel parse failed, trying text decoder fallback', e);
    }
  }

  // 2. Process CSV, TSV, TXT, or DBF files
  if (rawItems.length === 0) {
    const decoded = await smartDecodeFile(uint8);
    rawTextPreview = decoded.text.slice(0, 1000);

    // Try CSV / TSV with PapaParse
    const parsedCsv = Papa.parse<string[]>(decoded.text, {
      skipEmptyLines: true
    });

    if (parsedCsv.data && parsedCsv.data.length > 0) {
      rawItems = parseTableRows(parsedCsv.data, mapping);
    }

    // If table headers were not found, try text line-by-line regex parser (e.g. "Петля Blum 110 - 12 шт")
    if (rawItems.length === 0) {
      rawItems = parseTextLineByLine(decoded.text);
    }
  }

  // Deduplicate and aggregate identical hardware items (same name & article)
  const aggregatedHardwareMap = new Map<string, {
    article?: string;
    name: string;
    quantity: number;
    unit: string;
    category: string;
    notes?: string;
  }>();

  const aggregatedMaterialsMap = new Map<string, {
    article?: string;
    name: string;
    quantity: number;
    unit: string;
    category: string;
    notes?: string;
  }>();

  for (const item of rawItems) {
    const cleanName = item.name.trim();
    if (!cleanName || cleanName.length < 2) continue;

    const cleanArticle = (item.article || '').trim();
    const isMaterial = isMaterialOrFacadeItem(cleanName, excludeKeywords, reviewKeywords, cleanArticle);
    const key = `${cleanArticle}:::${cleanName.toLowerCase()}`;
    const qty = Math.max(1, Number(item.quantity) || 1);
    const unit = (item.unit || 'шт').trim() || 'шт';
    const category = item.category?.trim() || detectCategoryByName(cleanName);
    const notes = item.notes?.trim();

    const targetMap = isMaterial ? aggregatedMaterialsMap : aggregatedHardwareMap;

    if (targetMap.has(key)) {
      const existing = targetMap.get(key)!;
      existing.quantity += qty;
      if (!existing.notes && notes) existing.notes = notes;
    } else {
      targetMap.set(key, {
        article: cleanArticle || undefined,
        name: cleanName,
        quantity: qty,
        unit,
        category,
        notes: notes || undefined
      });
    }
  }

  // Transform into final OrderHardwareItem arrays
  const items: OrderHardwareItem[] = Array.from(aggregatedHardwareMap.values()).map((val, idx) => ({
    id: `hw-${Date.now()}-${idx + 1}`,
    article: val.article,
    name: val.name,
    quantity: val.quantity,
    unit: val.unit,
    category: val.category,
    packedQuantity: 0,
    notes: val.notes
  }));

  const detectedMaterials: OrderHardwareItem[] = Array.from(aggregatedMaterialsMap.values()).map((val, idx) => ({
    id: `mat-${Date.now()}-${idx + 1}`,
    article: val.article,
    name: val.name,
    quantity: val.quantity,
    unit: val.unit,
    category: val.category,
    packedQuantity: 0,
    notes: val.notes
  }));

  // Categories summary
  const catSummaryMap = new Map<string, { count: number; totalQuantity: number }>();
  let totalQuantity = 0;

  for (const item of items) {
    totalQuantity += item.quantity;
    const cat = item.category || 'Разное / Крепеж';
    if (!catSummaryMap.has(cat)) {
      catSummaryMap.set(cat, { count: 0, totalQuantity: 0 });
    }
    const catData = catSummaryMap.get(cat)!;
    catData.count += 1;
    catData.totalQuantity += item.quantity;
  }

  const categoriesSummary = Array.from(catSummaryMap.entries()).map(([category, stats]) => ({
    category,
    count: stats.count,
    totalQuantity: stats.totalQuantity
  })).sort((a, b) => b.totalQuantity - a.totalQuantity);

  return {
    fileName,
    fileSize,
    uploadedAt: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date().toLocaleDateString('ru-RU'),
    items,
    detectedMaterials,
    totalItemsCount: items.length,
    totalQuantity,
    categoriesSummary,
    rawTextPreview
  };
}

/**
 * Parses rows (from Excel or CSV) matching column headers using aliases
 */
function parseTableRows(
  rows: any[][],
  mapping: Record<string, string[]>
): Array<{ article?: string; name: string; quantity: number; unit?: string; category?: string; notes?: string }> {
  if (!rows || rows.length === 0) return [];

  let bestHeaderIndex = -1;
  let bestScore = -1;
  let bestCols: Record<string, number> = { name: -1, article: -1, quantity: -1, unit: -1, category: -1, notes: -1 };

  for (let r = 0; r < Math.min(rows.length, 60); r++) {
    const row = rows[r];
    if (!row || !Array.isArray(row) || row.length === 0) continue;

    const stringRow = row.map(c => (c !== null && c !== undefined ? String(c).trim().toLowerCase() : ''));
    const fullRowText = stringRow.join(' ');

    if (/^(ведомость|спецификация|заказ|проект|отчет|приложение|утверждаю)\b/i.test(fullRowText) &&
        !fullRowText.includes('наименование') && !fullRowText.includes('кол-во') && !fullRowText.includes('количество')) {
      continue;
    }

    const tempCols: Record<string, number> = { name: -1, article: -1, quantity: -1, unit: -1, category: -1, notes: -1 };

    stringRow.forEach((cell, idx) => {
      if (!cell) return;

      if (tempCols.name === -1) {
        if (/^(?:наименование|название|номенклатура|товар|позиция|элемент|комплектующие|деталь|покупные)\b/i.test(cell) ||
            (mapping.name || []).some(alias => cell === alias || (alias.length > 5 && cell.includes(alias) && !cell.includes('ведомость')))) {
          tempCols.name = idx;
        }
      }

      if (tempCols.article === -1) {
        if (/^(?:№\s*)?артикул\b/i.test(cell) || cell === 'артикул' || cell === 'код' || cell === 'обозначение' || cell === 'арт' ||
            (mapping.article || []).some(alias => cell === alias || (alias.length > 3 && cell.includes(alias)))) {
          tempCols.article = idx;
        }
      }

      if (tempCols.quantity === -1) {
        if (/^(?:кол-во|количество|кол|к-во|потребность|расход|всего|требуется|заказ|qty|count)\b/i.test(cell) ||
            (mapping.quantity || []).some(alias => cell === alias || (alias.length > 3 && cell.includes(alias)))) {
          tempCols.quantity = idx;
        }
      }

      if (tempCols.unit === -1) {
        if (/^(?:ед\.?\s*изм\.?|ед|единица|unit)\b/i.test(cell) ||
            (mapping.unit || []).some(alias => cell === alias)) {
          tempCols.unit = idx;
        }
      }

      if (tempCols.category === -1) {
        if (/^(?:категория|группа|тип|раздел|папка|вид)\b/i.test(cell) ||
            (mapping.category || []).some(alias => cell === alias)) {
          tempCols.category = idx;
        }
      }

      if (tempCols.notes === -1) {
        if (/^(?:примечание|комментарий|модуль|производитель|бренд)\b/i.test(cell) ||
            (mapping.notes || []).some(alias => cell === alias)) {
          tempCols.notes = idx;
        }
      }
    });

    let score = 0;
    if (tempCols.name !== -1) score += 10;
    if (tempCols.quantity !== -1) score += 10;
    if (tempCols.article !== -1) score += 8;
    if (tempCols.unit !== -1) score += 4;
    if (tempCols.category !== -1) score += 4;

    if (score >= 16 && (tempCols.name !== -1 || tempCols.article !== -1) && (tempCols.quantity !== -1 || tempCols.article !== -1)) {
      if (score > bestScore) {
        bestScore = score;
        bestHeaderIndex = r;
        bestCols = tempCols;
      }
    }
  }

  if (bestHeaderIndex === -1) {
    for (let r = 0; r < Math.min(rows.length, 30); r++) {
      const stringRow = rows[r].map(c => String(c ?? '').trim().toLowerCase());
      const nIdx = stringRow.findIndex(c => c.includes('наименов') || c.includes('номенклатур'));
      const aIdx = stringRow.findIndex(c => c.includes('артикул') || c.includes('обозначение') || c === 'код' || c === 'арт');
      const qIdx = stringRow.findIndex(c => c.includes('кол') || c.includes('qty') || c.includes('потреб') || c === 'шт');

      if (nIdx !== -1 || aIdx !== -1) {
        bestHeaderIndex = r;
        bestCols = {
          name: nIdx !== -1 ? nIdx : (aIdx !== -1 ? aIdx + 1 : 1),
          article: aIdx,
          quantity: qIdx !== -1 ? qIdx : (nIdx !== -1 ? nIdx + 1 : 2),
          unit: stringRow.findIndex(c => c.includes('ед')),
          category: stringRow.findIndex(c => c.includes('категор') || c.includes('групп')),
          notes: stringRow.findIndex(c => c.includes('примеч'))
        };
        break;
      }
    }
  }

  if (bestHeaderIndex === -1) {
    bestHeaderIndex = 0;
    bestCols = { name: 1, article: 0, quantity: 2, unit: 3, category: -1, notes: -1 };
  }

  const results: Array<{ article?: string; name: string; quantity: number; unit?: string; category?: string; notes?: string }> = [];

  for (let i = bestHeaderIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !Array.isArray(row) || row.length === 0) continue;

    const rawName = bestCols.name !== -1 && row[bestCols.name] !== undefined && row[bestCols.name] !== null ? String(row[bestCols.name]).trim() : '';
    const rawArticle = bestCols.article !== -1 && row[bestCols.article] !== undefined && row[bestCols.article] !== null ? String(row[bestCols.article]).trim() : '';

    if (!rawName && !rawArticle) continue;

    if (/^(итого|всего|total|подпись|сдал|принял|руководитель|заказчик)\b/i.test(rawName || rawArticle) ||
        (/^(наименование|артикул|номенклатура)\b/i.test(rawName) && /^(артикул|код|количество)\b/i.test(rawArticle))) {
      continue;
    }

    const name = rawName || rawArticle;
    if (name.length < 2) continue;

    let quantity = 1;
    if (bestCols.quantity !== -1 && row[bestCols.quantity] !== undefined && row[bestCols.quantity] !== null) {
      const qStr = String(row[bestCols.quantity]).replace(',', '.').replace(/[^\d.]/g, '');
      const parsedQ = parseFloat(qStr);
      if (!isNaN(parsedQ) && parsedQ > 0) {
        quantity = Math.round(parsedQ * 100) / 100;
      }
    } else {
      const qtyMatch = name.match(/[\(\[\{]\s*(\d+(?:[.,]\d+)?)\s*(?:шт|компл|уп|п\.м\.?)\s*[\)\]\}]/i);
      if (qtyMatch) {
        const parsed = parseFloat(qtyMatch[1].replace(',', '.'));
        if (!isNaN(parsed) && parsed > 0) {
          quantity = parsed;
        }
      }
    }

    let unit = 'шт';
    if (bestCols.unit !== -1 && row[bestCols.unit]) {
      unit = String(row[bestCols.unit]).trim() || 'шт';
    }

    let category = '';
    if (bestCols.category !== -1 && row[bestCols.category]) {
      category = String(row[bestCols.category]).trim();
    }

    let notes = '';
    if (bestCols.notes !== -1 && row[bestCols.notes]) {
      notes = String(row[bestCols.notes]).trim();
    }

    results.push({
      article: rawArticle || undefined,
      name,
      quantity,
      unit,
      category: category || undefined,
      notes: notes || undefined
    });
  }

  return results;
}

/**
 * Fallback line-by-line parser for plain text specification (e.g. copy-pasted or Bazis text export)
 */
function parseTextLineByLine(
  text: string
): Array<{ article?: string; name: string; quantity: number; unit?: string; category?: string; notes?: string }> {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const items: Array<{ article?: string; name: string; quantity: number; unit?: string; category?: string; notes?: string }> = [];

  for (const line of lines) {
    // Skip separators and headers
    if (line.startsWith('---') || line.startsWith('===') || line.startsWith('***')) continue;
    if (/^(наименование|ведомость|спецификация|заказ|фурнитура)/i.test(line) && line.length < 50) continue;

    // Pattern 1: "1. Петля Clip-top 110 Blum - 16 шт." or "Петля 110 ... 16 шт"
    const matchWithUnit = line.match(/^(?:(?:\d+[\.\)]\s*)?(?:\[([^\]]+)\]\s*)?)(.+?)(?:[\s—–:-]+|\t+)(\d+(?:[.,]\d+)?)\s*(шт|компл|п\.м|уп|комплекта?|штук[аи]?)?(?:\s*\((.*?)\))?$/i);
    if (matchWithUnit) {
      const article = matchWithUnit[1]?.trim();
      const name = matchWithUnit[2].trim();
      const qty = parseFloat(matchWithUnit[3].replace(',', '.'));
      const unit = matchWithUnit[4] || 'шт';
      const notes = matchWithUnit[5]?.trim();

      if (name && !isNaN(qty) && qty > 0) {
        items.push({
          article: article || undefined,
          name,
          quantity: qty,
          unit,
          notes: notes || undefined
        });
        continue;
      }
    }

    // Pattern 2: Tab-separated or multi-space line with number at end
    const tabParts = line.split(/\t+|\s{2,}/).map(p => p.trim()).filter(Boolean);
    if (tabParts.length >= 2) {
      const lastPart = tabParts[tabParts.length - 1];
      const qtyNum = parseFloat(lastPart.replace(',', '.'));
      if (!isNaN(qtyNum) && qtyNum > 0) {
        const name = tabParts.slice(0, tabParts.length - 1).join(' ');
        items.push({
          name,
          quantity: qtyNum,
          unit: 'шт'
        });
      }
    }
  }

  return items;
}
